// Nikud (vowel marks and dots) are the Hebrew combining marks U+0591 to U+05C7.
const NIKUD = /[֑-ׇ]/g;

export const stripNikud = (s: string) => s.replace(NIKUD, "");

// True when `pointed` is `plain` with vowel marks added. Fully pointed spelling often drops or adds a י
// or ו that only stands for a vowel (תיקחי is pointed תִּקְחִי), so those two letters, spaces and
// punctuation are ignored in the comparison: every other letter must match, in order, and the number
// of words must be the same. This is how an AI answer is checked, so it can never change the words.
export function isPointedVersion(plain: string, pointed: string): boolean {
  const letters = (s: string) => stripNikud(s).replace(/[^\u05D0-\u05EA]/g, "").replace(/[יו]/g, "");
  const words = (s: string) => stripNikud(s).split(/\s+/).filter((w) => /[\u05D0-\u05EA]/.test(w)).length;
  return pointed.trim().length > 0 && letters(plain) === letters(pointed) && words(plain) === words(pointed);
}
