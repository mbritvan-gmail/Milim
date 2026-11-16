"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider, AIError } from "@/lib/ai";
import { MAX_LINES, MAX_LYRICS_CHARS, parseLyrics, sectionEnglish } from "@/lib/lyrics";
import { parseMedia } from "@/lib/media";
import { findTracks, SpotifyError, type SpotifyMatch } from "@/lib/spotify";

export type CreateSongState = { error?: string };

const DAILY_SONG_LIMIT = 15;

export async function createSong(
  _prev: CreateSongState,
  formData: FormData,
): Promise<CreateSongState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim();
  const mediaInput = String(formData.get("media_url") ?? "").trim();
  const lyrics = String(formData.get("lyrics") ?? "");
  const makePublic = formData.get("visibility") === "public";

  if (!title) return { error: "Please give the song a title." };
  if (title.length > 120 || artist.length > 120) return { error: "Title and artist must be under 120 characters." };
  if (lyrics.length > MAX_LYRICS_CHARS) {
    return { error: `Lyrics are too long (max ${MAX_LYRICS_CHARS.toLocaleString()} characters).` };
  }

  const items = parseLyrics(lyrics);
  const lines = items.filter((i) => !i.section).map((i) => i.text);
  if (lines.length === 0) return { error: "Paste some Hebrew lyrics (we couldn't find any Hebrew text)." };
  if (lines.length > MAX_LINES) return { error: `Too many lines (max ${MAX_LINES}). Try one song at a time.` };

  let media = null;
  if (mediaInput) {
    media = parseMedia(mediaInput);
    if (!media) return { error: "That doesn't look like a Spotify or YouTube link." };
  }

  // Simple per-user daily limit so a single account can't run up the AI bill.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("songs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_SONG_LIMIT) {
    return { error: "You've reached today's limit for adding songs. Please try again tomorrow." };
  }

  let songId: string;
  try {
    const analysis = await getAIProvider().analyzeLyrics({ title, lines });

    // Put section labels (Verse, Chorus...) back in their original places. They are not
    // translated by the AI; they get a standard English name instead.
    type Row = { hebrew: string; transliteration: string | null; english: string | null };
    const rows: Row[] = [];
    const positionOfLyric: number[] = []; // lyric index (as the AI saw it) -> final position
    let lyricIndex = 0;
    for (const item of items) {
      if (item.section) {
        rows.push({ hebrew: item.text, transliteration: null, english: sectionEnglish(item.text) });
      } else {
        const l = analysis.lines[lyricIndex++];
        positionOfLyric.push(rows.length);
        rows.push({ hebrew: l.hebrew, transliteration: l.transliteration || null, english: l.english || null });
      }
    }

    // Always create as private first, so a failure part-way can be cleaned up
    // (public songs can't be deleted). Make it public only at the very end.
    const { data: song, error: songError } = await supabase
      .from("songs")
      .insert({
        owner_id: user.id,
        title,
        artist: artist || null,
        media_url: media?.url ?? null,
        media_type: media?.type ?? null,
        visibility: "private",
      })
      .select("id")
      .single();
    if (songError || !song) throw new Error(`song insert: ${songError?.message}`);
    songId = song.id;

    try {
      const { data: lineRows, error: linesError } = await supabase
        .from("lines")
        .insert(
          rows.map((r, i) => ({ song_id: songId, position: i, ...r })),
        )
        .select("id, position");
      if (linesError || !lineRows) throw new Error(`lines insert: ${linesError?.message}`);
      const lineIdByPosition = new Map(lineRows.map((r) => [r.position, r.id]));

      if (analysis.vocab.length > 0) {
        const { error: vocabError } = await supabase.from("vocab_entries").upsert(
          analysis.vocab.map((w) => ({
            lemma: w.lemma,
            transliteration: w.transliteration || null,
            english: w.english,
            part_of_speech: w.part_of_speech || null,
          })),
          { onConflict: "lemma,english", ignoreDuplicates: true },
        );
        if (vocabError) throw new Error(`vocab upsert: ${vocabError.message}`);

        const { data: entries, error: lookupError } = await supabase
          .from("vocab_entries")
          .select("id, lemma, english")
          .in("lemma", [...new Set(analysis.vocab.map((w) => w.lemma))]);
        if (lookupError || !entries) throw new Error(`vocab lookup: ${lookupError?.message}`);
        const idByKey = new Map(entries.map((e) => [`${e.lemma}|${e.english}`, e.id]));

        const songWords = new Map<string, { song_id: string; vocab_entry_id: string; surface_form: string; line_id: string | null; source: string }>();
        for (const w of analysis.vocab) {
          const vocabId = idByKey.get(`${w.lemma}|${w.english}`);
          if (!vocabId || songWords.has(vocabId)) continue;
          songWords.set(vocabId, {
            song_id: songId,
            vocab_entry_id: vocabId,
            surface_form: w.surface_form,
            line_id: lineIdByPosition.get(positionOfLyric[w.line_index]) ?? null,
            source: "ai",
          });
        }
        if (songWords.size > 0) {
          const { error: swError } = await supabase.from("song_words").insert([...songWords.values()]);
          if (swError) throw new Error(`song_words insert: ${swError.message}`);
        }
      }

      if (makePublic) {
        const { error: publicError } = await supabase.from("songs").update({ visibility: "public" }).eq("id", songId);
        if (publicError) throw new Error(`publish: ${publicError.message}`);
      }
    } catch (error) {
      // Remove the half-created (still private) song so nothing is left behind.
      await supabase.from("songs").delete().eq("id", songId);
      throw error;
    }
  } catch (error) {
    if (error instanceof AIError) return { error: error.message };
    console.error("createSong failed", error);
    return { error: "Something went wrong while saving your song. Please try again." };
  }

  redirect(`/songs/${songId}`);
}

export type SpotifySearchResult = { matches?: SpotifyMatch[]; error?: string };

// "Find on Spotify": suggest tracks for a title and artist.
export async function findOnSpotify(title: string, artist: string): Promise<SpotifySearchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const t = title.trim().slice(0, 120);
  const a = artist.trim().slice(0, 120);
  if (!t) return { error: "Enter the song title first." };

  try {
    const matches = await findTracks(t, a);
    if (matches.length === 0) return { error: "No matches found on Spotify. You can paste a link instead." };
    return { matches };
  } catch (error) {
    if (error instanceof SpotifyError) return { error: error.message };
    console.error("findOnSpotify failed", error);
    return { error: "Spotify search failed. Please try again." };
  }
}
