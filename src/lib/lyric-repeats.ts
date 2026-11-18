import { isSectionLabel, sectionEnglish, hasHebrew } from "./lyrics";

// Works out how to show a song's lyrics compactly. This only changes what is displayed; the lines
// themselves are loaded and saved exactly as before.
//   * A whole section that repeats an earlier section (same lines) becomes a one-row "Repeat" band.
//   * Inside a section (or a song with no sections), a block of 1 to 8 lines that repeats back to back
//     is shown once, with a "Repeats N×" chip that expands to show every repetition.

export type RepeatLine = { id: string; hebrew: string };

export type LyricItem =
  | { kind: "band"; key: string; english: string; hebrew: string; first: boolean }
  | { kind: "repeatBand"; key: string; english: string; hebrew: string; open: boolean }
  | { kind: "chip"; key: string; n: number; open: boolean }
  | { kind: "line"; key: string; line: RepeatLine; /** Lines whose English this row reveals together (more than one when a block is collapsed). */ ids: string[]; last: boolean }
  | { kind: "divider"; key: string };

export const MAX_BLOCK = 8;

// For comparison only: no vowel marks, no punctuation, one space between words, Latin lower-cased.
export function normalizeLine(text: string): string {
  return text
    .replace(/[֑-ׇ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type Section = { label: RepeatLine | null; lines: RepeatLine[] };

function splitSections(lines: RepeatLine[]): Section[] {
  const out: Section[] = [];
  let cur: Section = { label: null, lines: [] };
  for (const l of lines) {
    if (isSectionLabel(l.hebrew)) {
      if (cur.label || cur.lines.length) out.push(cur);
      cur = { label: l, lines: [] };
    } else cur.lines.push(l);
  }
  if (cur.label || cur.lines.length) out.push(cur);
  return out;
}

function isPeriodic(block: string[]): boolean {
  for (let d = 1; d < block.length; d++) {
    if (block.length % d === 0 && block.every((n, k) => n === block[k % d])) return true;
  }
  return false;
}

type Block = { start: number; len: number; times: number };

// The longest block that repeats back to back at position i (2 or more times), if any.
export function findBlock(norm: string[], i: number): Block | null {
  const rest = norm.length - i;
  for (let len = Math.min(MAX_BLOCK, Math.floor(rest / 2)); len >= 1; len--) {
    if (norm.slice(i, i + len).some((n) => !n)) continue;
    if (isPeriodic(norm.slice(i, i + len))) continue; // e.g. [a, a] is just 'a' twice; the shorter block wins
    let times = 1;
    while (i + (times + 1) * len <= norm.length && norm.slice(i + times * len, i + (times + 1) * len).every((n, k) => n === norm[i + k])) times++;
    if (times >= 2) return { start: i, len, times };
  }
  return null;
}

export function buildLyricItems(lines: RepeatLine[], open: ReadonlySet<string>): LyricItem[] {
  const items: LyricItem[] = [];
  const seen = new Set<string>();
  const sections = splitSections(lines);

  const pushLines = (ls: RepeatLine[], keyPrefix: string) => {
    const norm = ls.map((l) => normalizeLine(l.hebrew));
    const rows: LyricItem[] = [];
    for (let i = 0; i < ls.length; ) {
      const b = findBlock(norm, i);
      if (!b) {
        rows.push({ kind: "line", key: ls[i].id, line: ls[i], ids: [ls[i].id], last: false });
        i++;
        continue;
      }
      const key = `${keyPrefix}:${ls[i].id}`;
      const isOpen = open.has(key);
      rows.push({ kind: "chip", key, n: b.times, open: isOpen });
      const shown = isOpen ? b.len * b.times : b.len;
      // Collapsed rows reveal the same line in every repetition at once.
      const allIds = (k: number) => Array.from({ length: b.times }, (_, t) => ls[i + t * b.len + (k % b.len)].id);
      for (let k = 0; k < shown; k++) {
        const line = ls[i + k];
        rows.push({ kind: "line", key: line.id, line, ids: isOpen ? [line.id] : allIds(k), last: false });
      }
      rows.push({ kind: "divider", key: `${key}:div` });
      i += b.len * b.times;
    }
    if (rows[rows.length - 1]?.kind === "divider") rows.pop(); // nothing follows in this section
    items.push(...rows);
  };

  sections.forEach((s, idx) => {
    const sectionStart = items.length;
    if (s.label) {
      const inner = s.label.hebrew.replace(/^\[|\]$/g, "").trim();
      const english = sectionEnglish(s.label.hebrew) ?? "";
      const hebrew = hasHebrew(inner) ? inner : "";
      const sig = s.lines.map((l) => normalizeLine(l.hebrew)).join("\n");
      if (s.lines.length > 0 && sig.replace(/\n/g, "") && seen.has(sig)) {
        const key = `section:${s.label.id}`;
        const isOpen = open.has(key);
        items.push({ kind: "repeatBand", key, english: english || inner, hebrew, open: isOpen });
        if (isOpen) pushLines(s.lines, key);
        markLast(items, sectionStart);
        return;
      }
      if (sig.replace(/\n/g, "")) seen.add(sig);
      items.push({ kind: "band", key: s.label.id, english: english || inner, hebrew, first: idx === 0 });
    } else {
      const sig = s.lines.map((l) => normalizeLine(l.hebrew)).join("\n");
      if (sig.replace(/\n/g, "")) seen.add(sig);
    }
    pushLines(s.lines, `lines:${s.label?.id ?? "lead"}`);
    markLast(items, sectionStart);
  });
  return items;
}

// A row has no divider below it when it ends its section (the next band or the card edge follows).
function markLast(items: LyricItem[], from: number) {
  for (let i = items.length - 1; i >= from; i--) {
    const it = items[i];
    if (it.kind === "line") {
      it.last = true;
      return;
    }
    if (it.kind === "divider") continue;
    return;
  }
}
