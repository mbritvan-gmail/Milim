// How the Dictionary's words can be ordered.
export type WordSortKey = "english" | "hebrew";
export const WORD_SORTS: { id: WordSortKey; label: string; short: string }[] = [
  { id: "english", label: "English A to Z", short: "English" },
  { id: "hebrew", label: "Hebrew א to ת", short: "Hebrew" },
];
export function isWordSortKey(x: unknown): x is WordSortKey {
  return x === "english" || x === "hebrew";
}

type SortableWord = { english: string; lemma: string };
const english = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const hebrew = new Intl.Collator("he", { sensitivity: "base" });
// A verb is filed under its main word: "to love" sits with the L words.
const bareEnglish = (s: string) => s.replace(/^to\s+/i, "").trim();

export function sortWords<T extends SortableWord>(words: T[], key: WordSortKey): T[] {
  const byEnglish = (a: T, b: T) => english.compare(bareEnglish(a.english), bareEnglish(b.english)) || hebrew.compare(a.lemma, b.lemma);
  const copy = [...words];
  switch (key) {
    case "hebrew":
      return copy.sort((a, b) => hebrew.compare(a.lemma, b.lemma) || byEnglish(a, b));
    default:
      return copy.sort(byEnglish);
  }
}
