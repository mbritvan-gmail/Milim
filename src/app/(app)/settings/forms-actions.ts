"use server";

import { createClient } from "@/lib/supabase/server";
import { formsKind } from "@/lib/word-forms";

// Every verb in the dictionary that doesn't have its conjugation saved yet, for the "Conjugate all verbs" button.
// (Words are shared by everyone, so this covers verbs from anybody's songs and Word Packs.)
export async function verbsNeedingConjugation(): Promise<{ ok: true; verbs: { id: string; lemma: string }[] } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in again." };

    const verbs: { id: string; lemma: string }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("vocab_entries").select("id, lemma, part_of_speech").order("id").range(from, from + 999);
      if (error) return { ok: false, error: "Couldn't load the verbs." };
      for (const r of data ?? []) if (formsKind(r.part_of_speech) === "verb") verbs.push({ id: r.id as string, lemma: r.lemma as string });
      if (!data || data.length < 1000) break;
    }

    const have = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("word_forms").select("vocab_entry_id").order("vocab_entry_id").range(from, from + 999);
      if (error) return { ok: false, error: "Conjugation needs the latest database update, which hasn't been run yet." };
      for (const r of data ?? []) have.add(r.vocab_entry_id as string);
      if (!data || data.length < 1000) break;
    }
    return { ok: true, verbs: verbs.filter((v) => !have.has(v.id)) };
  } catch (error) {
    console.error("verbsNeedingConjugation crashed", error);
    return { ok: false, error: "Couldn't load the verbs." };
  }
}
