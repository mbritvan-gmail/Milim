"use server";

// TEMPORARY: the one-off "Add nikud to all songs" tool. Delete this file, nikud-tool.tsx, the card on the
// Settings page, and the fill_line_nikud database function once every song has nikud.
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { hasHebrew, isSectionLabel } from "@/lib/lyrics";
import { pointAll } from "@/lib/nikud-run";
import { isNikudAdmin } from "@/lib/nikud-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NikudToolSong = { id: string; title: string };
export type NikudToolStatus = { total: number; missing: NikudToolSong[] };

async function adminContext(): Promise<{ supabase: SupabaseClient } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  if (!isNikudAdmin(user.email)) return { error: "This tool isn't available for your account." };
  return { supabase };
}

// Reads every row of a query a page at a time (the database returns at most 1000 rows per request).
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

// How many songs there are, and which of them still have a lyric line or vocabulary word without nikud.
export async function loadNikudStatus(): Promise<NikudToolStatus | { error: string }> {
  try {
    const ctx = await adminContext();
    if ("error" in ctx) return ctx;
    const { supabase } = ctx;
    const songs = await readAll<{ id: string; title: string }>((a, b) => supabase.from("songs").select("id, title").order("id").range(a, b));
    const lines = await readAll<{ song_id: string; hebrew: string }>((a, b) => supabase.from("lines").select("song_id, hebrew").is("vocalized", null).order("id").range(a, b));
    const words = await readAll<{ song_id: string }>((a, b) =>
      supabase.from("song_words").select("song_id, vocab_entries!inner(vocalized)").is("vocab_entries.vocalized", null).order("song_id").order("vocab_entry_id").range(a, b),
    );
    const missing = new Set<string>();
    for (const l of lines) if (!isSectionLabel(l.hebrew) && hasHebrew(l.hebrew)) missing.add(l.song_id);
    for (const w of words) missing.add(w.song_id);
    return { total: songs.length, missing: songs.filter((s) => missing.has(s.id)).map((s) => ({ id: s.id, title: s.title })) };
  } catch (error) {
    console.error("loadNikudStatus failed", error);
    const detail = error instanceof Error ? ` (${error.message.slice(0, 120)})` : "";
    return { error: `Couldn't check the songs.${detail}` };
  }
}

export type NikudSongResult = { ok: true; added: number; skipped: number } | { ok: false; error: string };

// Adds nikud to one song's blank lyric lines and vocabulary words.
export async function addNikudToSong(songId: string): Promise<NikudSongResult> {
  try {
    const ctx = await adminContext();
    if ("error" in ctx) return { ok: false, error: ctx.error };
    const { supabase } = ctx;

    const linesRes = await supabase.from("lines").select("id, hebrew").eq("song_id", songId).is("vocalized", null).order("position");
    if (linesRes.error) return { ok: false, error: "Couldn't read the song." };
    const lines = (linesRes.data ?? []).filter((l) => !isSectionLabel(l.hebrew) && hasHebrew(l.hebrew));

    const wordsRes = await supabase.from("song_words").select("vocab_entries(id, lemma, vocalized)").eq("song_id", songId);
    const words = (wordsRes.data ?? []).flatMap((row) => {
      const v = (Array.isArray(row.vocab_entries) ? row.vocab_entries[0] : row.vocab_entries) as { id: string; lemma: string; vocalized: string | null } | undefined;
      return v && !v.vocalized ? [v] : [];
    });
    if (lines.length === 0 && words.length === 0) return { ok: true, added: 0, skipped: 0 };

    // Repeated lines (choruses) are only sent once.
    const texts = [...new Set([...lines.map((l) => l.hebrew), ...words.map((w) => w.lemma)])];
    const { answers, lastError } = await pointAll(getAIProvider(), texts);
    const byText = new Map(texts.map((t, i) => [t, answers[i]]));

    const lineItems = lines.flatMap((l) => {
      const text = byText.get(l.hebrew);
      return text ? [{ id: l.id, vocalized: text }] : [];
    });
    const wordItems = words.flatMap((w) => {
      const text = byText.get(w.lemma);
      return text ? [{ id: w.id, vocalized: text, gender: "", plural: "" }] : [];
    });
    if (lineItems.length + wordItems.length === 0) return { ok: false, error: lastError || "Claude's answer didn't match the lyrics." };

    if (lineItems.length > 0) {
      const { error } = await supabase.rpc("fill_line_nikud", { p_items: lineItems });
      if (error) {
        console.error("fill_line_nikud failed", error);
        return { ok: false, error: "Couldn't save. Has the database update been run?" };
      }
    }
    if (wordItems.length > 0) {
      const { error } = await supabase.rpc("fill_word_extras", { p_items: wordItems });
      if (error) console.error("fill_word_extras failed", error);
    }
    const total = lines.length + words.length;
    const added = lineItems.length + wordItems.length;
    return { ok: true, added, skipped: Math.max(0, total - added) };
  } catch (error) {
    console.error("addNikudToSong crashed", error);
    return { ok: false, error: "Something went wrong." };
  }
}
