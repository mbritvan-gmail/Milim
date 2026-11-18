import { fixLinePunctuation, hasHebrew, parseLyrics, type LyricItem } from "./lyrics";
import { normalizeLine } from "./lyric-repeats";

// Guesses section headers (Verse 1, Chorus, ...) for lyrics that were pasted without any.
//   * Stanzas are the paragraphs the person pasted (separated by blank lines).
//   * A stanza that comes back later (same lines, or most of them) is the Chorus.
//   * The rest are numbered Verses; a few clear shapes get a more specific name (see labelStanzas).
// Lyrics that already have headers, or that show no structure at all, are left alone (returns null).

const SIMILAR = 0.6;
const MAX_BLOCK = 8;

function stanzasOf(raw: string): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const text = fixLinePunctuation(line.replace(/\s+/g, " ").trim());
    if (!text) {
      if (cur.length) out.push(cur);
      cur = [];
    } else if (hasHebrew(text)) cur.push(text);
  }
  if (cur.length) out.push(cur);
  return out;
}

// For lyrics with no blank lines: finds the longest block of 2 to 8 lines that appears at least twice
// (not overlapping) and cuts the lyrics into stanzas around its appearances.
function splitByRepeats(lines: string[]): string[][] | null {
  const norm = lines.map(normalizeLine);
  const key = (i: number, len: number) => norm.slice(i, i + len).join("\n");
  for (let len = Math.min(MAX_BLOCK, Math.floor(lines.length / 2)); len >= 2; len--) {
    for (let i = 0; i + len <= lines.length; i++) {
      const block = norm.slice(i, i + len);
      if (block.some((n) => !n) || new Set(block).size < 2) continue;
      const k = key(i, len);
      let later = false;
      for (let j = i + len; j + len <= lines.length; j++) if (key(j, len) === k) later = true;
      if (!later) continue;
      // Cut the lyrics into segments: each appearance of the block, and what lies between them.
      const stanzas: string[][] = [];
      let gap: string[] = [];
      for (let p = 0; p < lines.length; ) {
        if (p + len <= lines.length && key(p, len) === k) {
          if (gap.length) stanzas.push(gap);
          gap = [];
          stanzas.push(lines.slice(p, p + len));
          p += len;
        } else gap.push(lines[p++]);
      }
      if (gap.length) stanzas.push(gap);
      return stanzas;
    }
  }
  return null;
}

type Group = { members: number[] };

// One label per stanza.
export function labelStanzas(stanzas: string[][]): string[] {
  const sets = stanzas.map((s) => new Set(s.map(normalizeLine).filter(Boolean)));
  const n = stanzas.length;
  // Group stanzas that share most of their lines.
  const parent = stanzas.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const small = Math.min(sets[i].size, sets[j].size);
      if (small === 0) continue;
      let shared = 0;
      for (const x of sets[i]) if (sets[j].has(x)) shared++;
      if (shared / small >= SIMILAR) parent[find(j)] = find(i);
    }
  }
  const byRoot = new Map<number, Group>();
  for (let i = 0; i < n; i++) {
    const g = byRoot.get(find(i)) ?? { members: [] };
    g.members.push(i);
    byRoot.set(find(i), g);
  }
  const avg = (g: Group) => g.members.reduce((a, i) => a + stanzas[i].length, 0) / g.members.length;
  const repeated = [...byRoot.values()].filter((g) => g.members.length >= 2);
  const chorus = [...repeated].sort((a, b) => b.members.length - a.members.length || avg(b) - avg(a))[0] ?? null;
  const chorusAt = new Set(chorus?.members ?? []);
  const label: (string | null)[] = stanzas.map((_, i) => (chorusAt.has(i) ? "Chorus" : null));

  // A repeated group that always comes right before the chorus, and is no longer than it, is a Pre-chorus.
  if (chorus) {
    for (const g of repeated) {
      if (g === chorus) continue;
      if (g.members.every((i) => chorusAt.has(i + 1)) && avg(g) <= avg(chorus)) for (const i of g.members) label[i] = "Pre-chorus";
    }
  }

  // The rest are Verses; a few clear shapes get another name. Only stanzas that appear once qualify.
  const single = (i: number) => label[i] === null && byRoot.get(find(i))!.members.length === 1;
  const others = stanzas.map((_, i) => i).filter((i) => label[i] === null);
  const sizes = others.map((i) => stanzas[i].length).sort((a, b) => a - b);
  const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0;
  if (chorus) {
    const lastChorus = Math.max(...chorus.members);
    const choruses = [...chorus.members].sort((a, b) => a - b);
    // Outro: the very last stanza, after the final chorus, clearly shorter than a verse.
    if (n - 1 > lastChorus && single(n - 1) && stanzas[n - 1].length <= 4 && stanzas[n - 1].length <= 0.6 * median) label[n - 1] = "Outro";
    // Intro: a very short opening stanza before the first chorus, when there are plenty of other stanzas.
    if (single(0) && stanzas[0].length <= 2 && n >= 4 && stanzas[0].length <= 0.5 * median && choruses[0] > 0) label[0] = "Intro";
    // Bridge: the last lone stanza between two choruses, after two verses and two choruses, not longer than a verse.
    for (let i = n - 2; i > 0; i--) {
      if (!single(i)) continue;
      const before = choruses.filter((c) => c < i).length;
      const after = choruses.some((c) => c > i);
      const verses = others.filter((o) => o < i && label[o] === null).length;
      if (before >= 2 && after && verses >= 2 && stanzas[i].length <= median) {
        label[i] = "Bridge";
        break;
      }
    }
  }
  let v = 0;
  return label.map((l) => l ?? `Verse ${++v}`);
}

export function detectSections(raw: string): LyricItem[] | null {
  const items = parseLyrics(raw);
  if (items.length === 0 || items.some((i) => i.section)) return null;
  let stanzas = stanzasOf(raw);
  if (stanzas.length === 1) stanzas = splitByRepeats(stanzas[0]) ?? stanzas;
  if (stanzas.length < 2) return null;
  const labels = labelStanzas(stanzas);
  const out: LyricItem[] = [];
  stanzas.forEach((s, i) => {
    out.push({ text: `[${labels[i]}]`, section: true });
    for (const text of s) out.push({ text, section: false });
  });
  // Safety net: the lyric lines must be exactly the ones that were pasted, in the same order.
  const same = out.filter((o) => !o.section).map((o) => o.text).join("\n") === items.map((o) => o.text).join("\n");
  return same ? out : null;
}
