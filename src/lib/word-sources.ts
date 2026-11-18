import type { SupabaseClient } from "@supabase/supabase-js";
import { chunk } from "./study";
import { readAllRows } from "./paged";

// Where a person's words come from: the songs they have and the Word Packs they have added.
export type Source = { id: string; title: string; words: string[] };
export type Sources = { songs: Source[]; packs: Source[] };

async function titlesAndWords(
  supabase: SupabaseClient,
  ids: string[],
  table: "songs" | "modules",
  words: "song_words" | "module_words",
  key: "song_id" | "module_id",
): Promise<Source[]> {
  const titles = new Map<string, string>();
  const byId = new Map<string, string[]>();
  for (const part of chunk(ids, 60)) {
    const { data, error } = await supabase.from(table).select("id, title").in("id", part);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) titles.set(r.id as string, r.title as string);
    const rows = await readAllRows<{ id: string; vocab_entry_id: string }>((a, b) =>
      supabase.from(words).select(`id:${key}, vocab_entry_id`).in(key, part).order(key).order("vocab_entry_id").range(a, b) as unknown as PromiseLike<{ data: { id: string; vocab_entry_id: string }[] | null; error: { message: string } | null }>,
    );
    if (rows.error) throw new Error(rows.error);
    for (const r of rows.data) byId.set(r.id, [...(byId.get(r.id) ?? []), r.vocab_entry_id]);
  }
  return [...titles.entries()]
    .map(([id, title]) => ({ id, title, words: byId.get(id) ?? [] }))
    .sort((a, b) => a.title.localeCompare(b.title, "he"));
}

// Best effort: if something is missing (for instance the Word Packs database script was never run) that part
// comes back empty, so the screens that use this keep working.
export async function loadSources(supabase: SupabaseClient, userId: string): Promise<Sources> {
  const out: Sources = { songs: [], packs: [] };
  try {
    const mine = await readAllRows<{ song_id: string }>((a, b) => supabase.from("user_songs").select("song_id").eq("user_id", userId).order("song_id").range(a, b));
    if (!mine.error) out.songs = await titlesAndWords(supabase, mine.data.map((r) => r.song_id), "songs", "song_words", "song_id");
  } catch (error) {
    console.error("loadSources songs failed", error);
  }
  try {
    const mine = await readAllRows<{ module_id: string }>((a, b) => supabase.from("user_modules").select("module_id").eq("user_id", userId).order("module_id").range(a, b));
    if (!mine.error) out.packs = await titlesAndWords(supabase, mine.data.map((r) => r.module_id), "modules", "module_words", "module_id");
  } catch (error) {
    console.error("loadSources packs failed", error);
  }
  return out;
}

// The ids of every word the person has learned.
export async function loadLearnedIds(supabase: SupabaseClient): Promise<Set<string>> {
  const { data } = await readAllRows<{ vocab_entry_id: string }>((a, b) =>
    supabase.from("user_words").select("vocab_entry_id").not("learned_at", "is", null).order("vocab_entry_id").range(a, b),
  );
  return new Set(data.map((r) => r.vocab_entry_id));
}

// For each word, the titles of the songs and Packs it comes from.
export function sourcesByWord(sources: Sources): Map<string, { songs: string[]; packs: string[] }> {
  const map = new Map<string, { songs: string[]; packs: string[] }>();
  const add = (list: Source[], kind: "songs" | "packs") => {
    for (const s of list) {
      for (const w of s.words) {
        const e = map.get(w) ?? { songs: [], packs: [] };
        if (!e[kind].includes(s.title)) e[kind].push(s.title);
        map.set(w, e);
      }
    }
  };
  add(sources.songs, "songs");
  add(sources.packs, "packs");
  return map;
}

// "verb · from Hava Nagila, Hatikva", "noun · from 3 songs · Pack: Nature"
export function sourceNote(partOfSpeech: string | null, found: { songs: string[]; packs: string[] } | undefined): string {
  const parts: string[] = [];
  if (partOfSpeech) parts.push(partOfSpeech);
  const songs = found?.songs ?? [];
  const packs = found?.packs ?? [];
  if (songs.length === 1 || songs.length === 2) parts.push(`from ${songs.join(", ")}`);
  else if (songs.length > 2) parts.push(`from ${songs.length} songs`);
  if (packs.length === 1) parts.push(`Pack: ${packs[0]}`);
  else if (packs.length > 1) parts.push(`${packs.length} Packs`);
  return parts.join(" · ");
}
