export const MAX_LYRICS_CHARS = 12000;
export const MAX_LINES = 100;

const HEBREW = /[֐-׿]/;

export function hasHebrew(text: string) {
  return HEBREW.test(text);
}

// Split pasted lyrics into clean lines. Blank lines (stanza breaks) are dropped, and
// lines with no Hebrew at all are ignored, since Milim focuses on the Hebrew.
export function splitLyrics(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0 && hasHebrew(l));
}
