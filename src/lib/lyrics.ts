export const MAX_LYRICS_CHARS = 12000;
export const MAX_LINES = 100;

const HEBREW = /[֐-׿]/;

export function hasHebrew(text: string) {
  return HEBREW.test(text);
}

// Section labels such as "[Chorus]", "[בית א']" or "[קדם-פזמון]". Only square brackets
// count, because parentheses are often used for real backing vocals in the lyrics.
export function isSectionLabel(text: string) {
  return /^\[[^\]]{1,40}\]$/.test(text.trim());
}

const SECTION_NAMES: [RegExp, string][] = [
  [/^(קדם[\s-]?פ(?:י)?זמון|pre[\s-]?chorus)/i, "Pre-chorus"],
  [/^(בתר[\s-]?פ(?:י)?זמון|post[\s-]?chorus)/i, "Post-chorus"],
  [/^(פ(?:י)?זמון|chorus|hook)/i, "Chorus"],
  [/^(בית|verse)/i, "Verse"],
  [/^(גשר|bridge)/i, "Bridge"],
  [/^(פתיחה|אינטרו|intro)/i, "Intro"],
  [/^(סיום|אאוטרו|outro)/i, "Outro"],
  [/^(סולו|solo)/i, "Solo"],
  [/^(אינטרלוד|interlude)/i, "Interlude"],
];

// English name for a section label, for display ("[בית 2]" -> "Verse 2").
export function sectionEnglish(label: string): string | null {
  // Tolerate stray quotes or punctuation, e.g. "['בית א]".
  const inner = label
    .trim()
    .replace(/^\[|\]$/g, "")
    .replace(/^[^\p{L}\d]+/u, "")
    .trim();
  for (const [pattern, name] of SECTION_NAMES) {
    if (pattern.test(inner)) {
      const digits = inner.match(/\d+/);
      const letter = inner.match(/\s([אבגד])['׳]?$/);
      const number = digits ? digits[0] : letter ? String("אבגד".indexOf(letter[1]) + 1) : null;
      return number ? `${name} ${number}` : name;
    }
  }
  // An English-only label we don't recognise is shown as written.
  return hasHebrew(inner) ? null : inner;
}

// A section header written without brackets: a line that is nothing but a section name, such as "Chorus",
// "Verse 1", "Pre-Chorus:", "(Bridge)", "פזמון" or "בית א'". Only exact section names count, so a real lyric line is
// never mistaken for one. Returns the header in the stored form with brackets ("[Verse 1]"), or null.
const BARE_ENGLISH = /^(pre[\s-]?chorus|post[\s-]?chorus|chorus|verse|bridge|intro|outro|hook|refrain|solo|interlude)(\s*\d+)?$/i;
const BARE_HEBREW = /^(קדם[\s-]?פ(?:י)?זמון|בתר[\s-]?פ(?:י)?זמון|פ(?:י)?זמון|גשר|פתיחה|אינטרו|סיום|אאוטרו|סולו|אינטרלוד)(\s*\d+)?$|^בית\s*(?:[א-ד]['׳]?|\d+)$/;
export function bareSectionLabel(text: string): string | null {
  const inner = text
    .trim()
    .replace(/^\(\s*(.*?)\s*\)$/, "$1")
    .replace(/\s*:$/, "")
    .trim();
  return inner.length <= 40 && (BARE_ENGLISH.test(inner) || BARE_HEBREW.test(inner)) ? `[${inner}]` : null;
}

export type LyricItem = { text: string; section: boolean };

// Lyrics copied from some websites or PDFs arrive with end-of-sentence punctuation at the front of the
// line ("?למה" instead of "למה?"), which shows up at the wrong edge in right-to-left text. If a line
// starts with such marks and doesn't already end with any, they move to the end.
const TERMINAL = /[.,;:!?…]/;
export function fixLinePunctuation(text: string): string {
  const match = text.match(/^([.,;:!?…]+)\s*(.+)$/);
  if (!match) return text;
  const rest = match[2].trim();
  if (!rest || TERMINAL.test(rest[rest.length - 1])) return text;
  return rest + match[1];
}

// Split pasted lyrics into clean items. Blank lines are dropped. Section labels are kept
// (and flagged) so they can be shown as headings and skipped by the translator. Other
// lines with no Hebrew at all are ignored, since milim focuses on the Hebrew.
export function parseLyrics(raw: string): LyricItem[] {
  const items: LyricItem[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const text = fixLinePunctuation(line.replace(/\s+/g, " ").trim());
    if (!text) continue;
    const bare = isSectionLabel(text) ? null : bareSectionLabel(text);
    if (isSectionLabel(text)) items.push({ text, section: true });
    else if (bare) items.push({ text: bare, section: true });
    else if (hasHebrew(text)) items.push({ text, section: false });
  }
  return items;
}

// Just the lyric lines (no section labels).
export function splitLyrics(raw: string): string[] {
  return parseLyrics(raw)
    .filter((i) => !i.section)
    .map((i) => i.text);
}
