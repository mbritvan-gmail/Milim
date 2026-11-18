"use server";

import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { AIError } from "@/lib/ai/types";
import { ConjugationSchema, looksComplete } from "@/lib/conjugation";
import { WordFormsSchema, adjectiveLooksComplete, formsKind, nounLooksComplete, type WordForms } from "@/lib/word-forms";

export type FormsResult = { ok: true; forms: WordForms; /** Tokens Claude used for this word (0 when it was already saved). */ usage?: { input: number; output: number } } | { ok: false; error: string };

function isComplete(w: WordForms): boolean {
  if (w.kind === "verb") return looksComplete(w.data);
  return w.kind === "noun" ? nounLooksComplete(w.data) : adjectiveLooksComplete(w.data);
}

// The forms for one word (a verb's conjugation, a noun's singular and plural, an adjective's four
// forms). The first time anyone asks, Claude writes them and they are saved (table word_forms) so every
// later request, from anyone, is instant.
export async function getWordForms(vocabId: string): Promise<FormsResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in again." };

    const { data: word } = await supabase.from("vocab_entries").select("id, lemma, english, part_of_speech").eq("id", vocabId).maybeSingle();
    if (!word) return { ok: false, error: "We couldn't find that word." };
    const kind = formsKind(word.part_of_speech);
    if (!kind) return { ok: false, error: "This kind of word doesn't have forms yet." };

    const saved = await supabase.from("word_forms").select("forms").eq("vocab_entry_id", vocabId).maybeSingle();
    if (saved.data) {
      // Rows saved by the first version hold a bare conjugation, without the "kind" wrapper.
      const raw = saved.data.forms as { kind?: string } | null;
      const wrapped = raw && raw.kind ? raw : { kind: "verb", data: raw };
      const parsed = WordFormsSchema.safeParse(wrapped);
      if (parsed.success && parsed.data.kind === kind && isComplete(parsed.data)) return { ok: true, forms: parsed.data };
    }

    const provider = getAIProvider();
    let forms: WordForms;
    const usage = { input: 0, output: 0 };
    if (kind === "verb") {
      const data = await provider.conjugateVerb({
        lemma: word.lemma,
        english: word.english,
        onUsage: (u) => {
          usage.input += u.input;
          usage.output += u.output;
        },
      });
      forms = { kind: "verb", data: ConjugationSchema.parse(data) };
    } else {
      forms = await provider.inflectWord({ lemma: word.lemma, english: word.english, kind });
    }
    const { error } = await supabase.from("word_forms").upsert({ vocab_entry_id: vocabId, forms }, { onConflict: "vocab_entry_id" });
    if (error) {
      // Still show the forms even if saving them failed (for example, the database script wasn't run).
      console.error("word_forms save failed", error);
    }
    return { ok: true, forms, usage };
  } catch (error) {
    if (error instanceof AIError) return { ok: false, error: error.message };
    console.error("getWordForms crashed", error);
    return { ok: false, error: "Couldn't load the forms. Please try again." };
  }
}
