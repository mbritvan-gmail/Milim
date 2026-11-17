import { z } from "zod";
import { ConjugationSchema, SegmentSchema, type DrawnSegment, type Segment } from "./conjugation";

// The "Forms" view for nouns and adjectives (verbs have their own: see conjugation.ts). Like verb forms,
// every form is stored as colored segments (stem + ending) with plain, vowel-marked and pronunciation
// text, so the nikud and pronunciation settings only change how it is drawn.

const SegmentList = z.array(SegmentSchema);

export const NounSchema = z.object({
  gender: z.enum(["masculine", "feminine"]),
  singular: SegmentList,
  plural: SegmentList,
  /** One short sentence when the plural is irregular or surprising; empty otherwise. */
  note: z.string(),
});
export const AdjectiveSchema = z.object({
  ms: SegmentList,
  fs: SegmentList,
  mp: SegmentList,
  fp: SegmentList,
  note: z.string(),
});

export const WordFormsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("verb"), data: ConjugationSchema }),
  z.object({ kind: z.literal("noun"), data: NounSchema }),
  z.object({ kind: z.literal("adjective"), data: AdjectiveSchema }),
]);

export type NounForms = z.infer<typeof NounSchema>;
export type AdjectiveForms = z.infer<typeof AdjectiveSchema>;
export type WordForms = z.infer<typeof WordFormsSchema>;
export type FormsKind = WordForms["kind"];

// Which "forms" view a word gets, from its part of speech (null: none).
export function formsKind(partOfSpeech: string | null | undefined): FormsKind | null {
  const p = partOfSpeech ?? "";
  if (/\bverb\b/i.test(p)) return "verb";
  if (/\badjective\b/i.test(p)) return "adjective";
  if (/\bnoun\b/i.test(p)) return "noun";
  return null;
}

export function drawSegments(segments: Segment[], nikud: boolean): DrawnSegment[] {
  return segments.map((s) => ({ type: s.type, text: nikud ? s.vocalized : s.plain, translit: s.translit }));
}

export function joinedText(segments: Segment[], nikud: boolean): string {
  return segments.map((s) => (nikud ? s.vocalized : s.plain)).join("");
}

const hasHebrew = (s: string) => /[א-ת]/.test(s);
export function nounLooksComplete(n: NounForms): boolean {
  return [n.singular, n.plural].every((f) => f.length > 0 && hasHebrew(f.map((s) => s.plain).join("")));
}
export function adjectiveLooksComplete(a: AdjectiveForms): boolean {
  return [a.ms, a.fs, a.mp, a.fp].every((f) => f.length > 0 && hasHebrew(f.map((s) => s.plain).join("")));
}
