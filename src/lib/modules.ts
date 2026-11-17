import { z } from "zod";

// Vocabulary modules: themed word lists. This file holds the shared limits, how a pasted list of
// Hebrew words is read, and the shape of what the AI returns for each word.

export const MAX_MODULE_WORDS = 100;
export const MAX_MODULE_TITLE = 120;

const NIKUD = /[֑-ׇ]/g;
const bare = (s: string) => s.replace(NIKUD, "");

// "כדורגל, כדורסל\nשחייה" -> ["כדורגל", "כדורסל", "שחייה"]. Items without Hebrew letters are dropped,
// repeats are removed (ignoring vowel marks), and a trailing note like "- soccer" is ignored.
export function parseWordList(text: string): { words: string[]; skipped: number } {
  const seen = new Set<string>();
  const words: string[] = [];
  let skipped = 0;
  for (const raw of text.split(/[\n,;،]+/)) {
    const item = raw.replace(/^[\s\-–—•*\d.)]+/, "").trim();
    if (!item) continue;
    // Keep only the Hebrew part (letters, vowel marks, spaces, quotes and maqaf for short phrases).
    const match = item.match(/[֐-׿][֐-׿\s'"׳״\-]*/);
    const word = (match?.[0] ?? "").replace(/[\s'"\-]+$/, "").trim();
    if (!/[א-ת]/.test(word)) {
      skipped++;
      continue;
    }
    const key = bare(word);
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(word);
  }
  return { words, skipped };
}

export const ModuleWordSchema = z.object({
  /** The word as it was pasted (used to match the answer to the list). */
  input: z.string(),
  /** Dictionary form without nikud; verbs as infinitives; nouns in the singular. */
  lemma: z.string(),
  vocalized: z.string(),
  transliteration: z.string(),
  english: z.string(),
  part_of_speech: z.string(),
  /** "m" or "f" for nouns, otherwise an empty string. */
  gender: z.string(),
  /** Unpointed plural form for nouns, otherwise an empty string. */
  plural: z.string(),
});
export type ModuleWordResult = z.infer<typeof ModuleWordSchema>;

export function cleanGender(g: string): "m" | "f" | null {
  const v = g.trim().toLowerCase();
  return v === "m" || v === "f" ? v : null;
}

// What to show for a Hebrew word: the pointed form when the person wants nikud and we have it.
export function hebrewText(lemma: string, vocalized: string | null | undefined, showNikud: boolean): string {
  return showNikud && vocalized ? vocalized : lemma;
}

export function genderLabel(gender: string | null | undefined, plural: string | null | undefined): string {
  const g = gender === "m" ? "masculine" : gender === "f" ? "feminine" : "";
  return [g, plural ? `plural ${plural}` : ""].filter(Boolean).join(" · ");
}
