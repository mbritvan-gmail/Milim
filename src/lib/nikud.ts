// Nikud (vowel marks and dots) are the Hebrew combining marks U+0591 to U+05C7.
const NIKUD = /[֑-ׇ]/g;

export const stripNikud = (s: string) => s.replace(NIKUD, "");

// True when `pointed` is `plain` with vowel marks added: same letters, spaces and punctuation.
// This is how an AI answer is checked, so it can never change the words themselves.
export function isPointedVersion(plain: string, pointed: string): boolean {
  const norm = (s: string) => stripNikud(s).replace(/\s+/g, " ").trim();
  return norm(plain) === norm(pointed) && pointed.trim().length > 0;
}
