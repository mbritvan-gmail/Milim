import { z } from "zod";

// Verb conjugation. Every form is stored as colored segments (prefix = who, stem = the verb,
// suffix = number or gender) with plain, vowel-marked and pronunciation text for each, so the
// "Show nikud" and "Show pronunciation" settings only change how a form is drawn.

export const SegmentSchema = z.object({
  type: z.enum(["prefix", "stem", "suffix"]),
  plain: z.string(),
  vocalized: z.string(),
  translit: z.string(),
});
export const FormSchema = z.object({
  gender: z.enum(["m", "f", "mf"]),
  segments: z.array(SegmentSchema),
});
const FormList = z.array(FormSchema);

export const ConjugationSchema = z.object({
  root: z.string(),
  binyan: z.string(),
  infinitive: z.object({ plain: z.string(), vocalized: z.string(), translit: z.string() }),
  present: z.object({ ms: FormSchema, fs: FormSchema, mp: FormSchema, fp: FormSchema }),
  past: z.object({ i: FormList, you: FormList, he: FormList, she: FormList, we: FormList, you_pl: FormList, they: FormList }),
  future: z.object({ i: FormList, you: FormList, he: FormList, she: FormList, we: FormList, you_pl: FormList, they: FormList }),
});

export type Segment = z.infer<typeof SegmentSchema>;
export type Form = z.infer<typeof FormSchema>;
export type ConjugationData = z.infer<typeof ConjugationSchema>;
export type Tense = "present" | "past" | "future";

export function isVerb(partOfSpeech: string | null | undefined): boolean {
  return /\bverb\b/i.test(partOfSpeech ?? "");
}

// ---------------------------------------------------------------------------
// What to draw
// ---------------------------------------------------------------------------
export type DrawnSegment = { type: Segment["type"]; text: string; translit: string };
export type DrawnLine = { tag: "m" | "f" | "m/f"; segments: DrawnSegment[] };
export type DrawnRow = { label: string; lines: DrawnLine[]; sameSpelling: boolean };
export type DrawnGroup = { name: "Singular" | "Plural"; rows: DrawnRow[] };

const TAG: Record<Form["gender"], DrawnLine["tag"]> = { m: "m", f: "f", mf: "m/f" };
const PERSONS = [
  ["i", "I", "Singular"],
  ["you", "you", "Singular"],
  ["he", "he", "Singular"],
  ["she", "she", "Singular"],
  ["we", "we", "Plural"],
  ["you_pl", "you (pl)", "Plural"],
  ["they", "they", "Plural"],
] as const;

const plainOf = (f: Form) => f.segments.map((s) => s.plain).join("");

function draw(form: Form, nikud: boolean, tag: DrawnLine["tag"]): DrawnLine {
  return { tag, segments: form.segments.map((s) => ({ type: s.type, text: nikud ? s.vocalized : s.plain, translit: s.translit })) };
}

// Forms that differ only by vowel marks (past "you", masculine and feminine) collapse into one line
// when nikud is off, with a note.
function row(label: string, forms: Form[], nikud: boolean): DrawnRow {
  if (!nikud && forms.length > 1 && forms.every((f) => plainOf(f) === plainOf(forms[0]))) {
    const first = draw(forms[0], false, "m/f");
    first.segments = first.segments.map((s, i) => {
      const options = [...new Set(forms.map((f) => f.segments[i]?.translit ?? ""))].filter(Boolean);
      return { ...s, translit: options.join(" / ") };
    });
    return { label, lines: [first], sameSpelling: true };
  }
  return { label, lines: forms.map((f) => draw(f, nikud, TAG[f.gender])), sameSpelling: false };
}

export function drawTense(data: ConjugationData, tense: Tense, nikud: boolean): DrawnGroup[] {
  if (tense === "present") {
    const p = data.present;
    return [
      { name: "Singular", rows: [row("I · you · he", [{ ...p.ms, gender: "m" }], nikud), row("I · you · she", [{ ...p.fs, gender: "f" }], nikud)] },
      { name: "Plural", rows: [row("we · you · they", [{ ...p.mp, gender: "m" }], nikud), row("we · you · they", [{ ...p.fp, gender: "f" }], nikud)] },
    ];
  }
  const t = data[tense];
  return (["Singular", "Plural"] as const).map((name) => ({
    name,
    rows: PERSONS.filter(([, , group]) => group === name)
      .map(([key, label]) => row(label, t[key], nikud))
      .filter((r) => r.lines.length > 0),
  }));
}

// A conjugation is only useful if every form has real Hebrew letters in it.
export function looksComplete(data: ConjugationData): boolean {
  const hasHebrew = (s: string) => /[א-ת]/.test(s);
  const forms: Form[] = [data.present.ms, data.present.fs, data.present.mp, data.present.fp];
  for (const tense of [data.past, data.future]) for (const list of Object.values(tense)) forms.push(...list);
  return forms.length > 0 && forms.every((f) => f.segments.length > 0 && hasHebrew(plainOf(f)));
}
