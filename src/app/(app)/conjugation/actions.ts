"use server";

import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { AIError } from "@/lib/ai/types";
import { ConjugationSchema, isVerb, looksComplete, type ConjugationData } from "@/lib/conjugation";

export type ConjugationResult = { ok: true; data: ConjugationData } | { ok: false; error: string };

// The forms for one verb. The first time anyone asks, Claude writes them and they are saved
// (table verb_forms) so every later request, from anyone, is instant.
export async function getConjugation(vocabId: string): Promise<ConjugationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in again." };

    const { data: word } = await supabase.from("vocab_entries").select("id, lemma, english, part_of_speech").eq("id", vocabId).maybeSingle();
    if (!word) return { ok: false, error: "We couldn't find that word." };
    if (!isVerb(word.part_of_speech)) return { ok: false, error: "That word isn't a verb." };

    const saved = await supabase.from("verb_forms").select("forms").eq("vocab_entry_id", vocabId).maybeSingle();
    if (saved.data) {
      const parsed = ConjugationSchema.safeParse(saved.data.forms);
      if (parsed.success && looksComplete(parsed.data)) return { ok: true, data: parsed.data };
    }

    const data = await getAIProvider().conjugateVerb({ lemma: word.lemma, english: word.english });
    const { error } = await supabase.from("verb_forms").upsert({ vocab_entry_id: vocabId, forms: data }, { onConflict: "vocab_entry_id" });
    if (error) {
      // Still show the forms even if saving them failed (for example, the database script wasn't run).
      console.error("verb_forms save failed", error);
    }
    return { ok: true, data };
  } catch (error) {
    if (error instanceof AIError) return { ok: false, error: error.message };
    console.error("getConjugation crashed", error);
    return { ok: false, error: "Couldn't load the forms. Please try again." };
  }
}
