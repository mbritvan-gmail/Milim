import type { SupabaseClient } from "@supabase/supabase-js";
import { chunk } from "./study";

// Optional details about a word that only some words have (nikud, gender, plural). They live in
// columns added by the vocabulary-modules database script; if that script hasn't been run yet the
// lookup quietly returns nothing, so everything else keeps working.
export type WordExtras = { vocalized: string | null; gender: string | null; plural: string | null };

// Just the nikud of the given words, looked up in parallel pieces (so it grows with the person's own words,
// not with every word in the app). Best effort, like loadWordExtras.
export async function loadNikudFor(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const results = await Promise.all(
    chunk([...new Set(ids)], 60).map((part) => supabase.from("vocab_entries").select("id, vocalized").in("id", part).not("vocalized", "is", null)),
  );
  for (const { data, error } of results) {
    if (error) continue;
    for (const r of data ?? []) map.set(r.id as string, r.vocalized as string);
  }
  return map;
}

export async function loadWordExtras(supabase: SupabaseClient, ids: string[]): Promise<Map<string, WordExtras>> {
  const map = new Map<string, WordExtras>();
  for (const part of chunk([...new Set(ids)], 60)) {
    const { data, error } = await supabase.from("vocab_entries").select("id, vocalized, gender, plural").in("id", part);
    if (error) return map;
    for (const r of data ?? []) map.set(r.id as string, { vocalized: r.vocalized ?? null, gender: r.gender ?? null, plural: r.plural ?? null });
  }
  return map;
}
