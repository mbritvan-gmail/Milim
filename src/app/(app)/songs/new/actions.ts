"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider, AIError } from "@/lib/ai";
import { pointAll } from "@/lib/nikud-run";
import { MAX_LINES, MAX_LYRICS_CHARS, parseLyrics, sectionEnglish } from "@/lib/lyrics";
import { CatalogError, searchSongs, type SongMatch } from "@/lib/deezer";
import { isMissingLinkColumn, readSongLinks, songLinkColumns } from "@/lib/song-links";
import { findTracks, SpotifyError, type SpotifyMatch } from "@/lib/spotify";
import { findVideos, YouTubeError, type YouTubeMatch } from "@/lib/youtube";

export type CreateSongState = { error?: string };

// A safety net against runaway AI costs (each song costs a few cents). Set DAILY_SONG_LIMIT in
// Vercel to change it; the default is generous for friends and family.
const DAILY_SONG_LIMIT = Number(process.env.DAILY_SONG_LIMIT) || 100;

type CreateSongOutcome = { error?: string; songId?: string; signedOut?: boolean };

// Wraps the real work so that any unexpected failure becomes a friendly message in the
// form instead of crashing the page. (redirect() works by throwing, so it's called here,
// outside the try block.)
export async function createSong(_prev: CreateSongState, formData: FormData): Promise<CreateSongState> {
  let outcome: CreateSongOutcome;
  try {
    outcome = await runCreateSong(formData);
  } catch (error) {
    console.error("createSong crashed", error);
    return { error: "Something went wrong while saving your song. Please try again." };
  }
  if (outcome.signedOut) redirect("/login");
  // Replace the form in the history, so closing the new song returns to the list, not the empty form.
  if (outcome.songId) redirect(`/songs/${outcome.songId}`, RedirectType.replace);
  return { error: outcome.error };
}

async function runCreateSong(formData: FormData): Promise<CreateSongOutcome> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedOut: true };

  const title = String(formData.get("title") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim();
  const lyrics = String(formData.get("lyrics") ?? "");
  const requestId = String(formData.get("request_id") ?? "").trim();
  // A song that fills a request is always public.
  const makePublic = formData.get("visibility") === "public" || Boolean(requestId);

  if (!title) return { error: "Please give the song a title." };
  if (title.length > 120 || artist.length > 120) return { error: "Title and artist must be under 120 characters." };
  if (lyrics.length > MAX_LYRICS_CHARS) {
    return { error: `Lyrics are too long (max ${MAX_LYRICS_CHARS.toLocaleString()} characters).` };
  }

  const items = parseLyrics(lyrics);
  const lines = items.filter((i) => !i.section).map((i) => i.text);
  if (lines.length === 0) return { error: "Paste some Hebrew lyrics (we couldn't find any Hebrew text)." };
  if (lines.length > MAX_LINES) return { error: `Too many lines (max ${MAX_LINES}). Try one song at a time.` };

  if (requestId) {
    // Make sure the request is still open before spending time on the AI.
    const { data: req, error: reqError } = await supabase.from("song_requests").select("status").eq("id", requestId).maybeSingle();
    if (reqError) return { error: "Song requests need the latest database update, which hasn't been run yet." };
    if (!req || req.status !== "open") return { error: "That request was already filled or cancelled. Go back to the Requests tab to pick another." };
  }

  const links = readSongLinks(formData);
  if ("error" in links) return { error: links.error };
  const columns = songLinkColumns(links);

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
    const aiStarted = Date.now();
    const analysis = await getAIProvider().analyzeLyrics({ title, lines });
    console.log(`createSong: AI done lines=${lines.length} words=${analysis.vocab.length} ms=${Date.now() - aiStarted}`);

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

    // Nikud for every line and vocabulary word, asked for while the song is being saved. It is a bonus: if it
    // fails the song is still saved, and Settings has a button that fills in anything missing later.
    const lemmas = [...new Set(analysis.vocab.map((w) => w.lemma))];
    const lyricTexts = rows.filter((_, i) => positionOfLyric.includes(i)).map((r) => r.hebrew);
    const nikudTexts = [...lyricTexts, ...lemmas];
    const nikudPromise = pointAll(getAIProvider(), nikudTexts).catch((error) => {
      console.error("createSong nikud failed", error);
      return null;
    });

    // Always create as private first, so a failure part-way can be cleaned up
    // (public songs can't be deleted). Make it public only at the very end.
    const base = { owner_id: user.id, title, artist: artist || null, visibility: "private" };
    let inserted = await supabase.from("songs").insert({ ...base, ...columns.extended }).select("id").single();
    if (inserted.error && isMissingLinkColumn(inserted.error)) {
      // The database script for song links hasn't been run yet: save with the single old link.
      inserted = await supabase.from("songs").insert({ ...base, ...columns.legacy }).select("id").single();
    }
    const { data: song, error: songError } = inserted;
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
      let entryRows: { id: string; lemma: string }[] = [];

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
        entryRows = entries;

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

      // Save the nikud (best effort; never fails the song).
      try {
        const nikud = await nikudPromise;
        if (nikud) {
          const { answers, usage } = nikud;
          console.log(`createSong: nikud texts=${nikudTexts.length} accepted=${answers.filter(Boolean).length} tokens in=${usage.input} out=${usage.output}`);
          await Promise.all(
            lyricTexts.map((_, i) => {
              const text = answers[i];
              const lineId = lineIdByPosition.get(positionOfLyric[i]);
              return text && lineId ? supabase.from("lines").update({ vocalized: text }).eq("id", lineId).eq("song_id", songId) : null;
            }),
          );
          const byLemma = new Map(lemmas.map((l, i) => [l, answers[lyricTexts.length + i]]));
          const items = entryRows.flatMap((e) => {
            const text = byLemma.get(e.lemma);
            return text ? [{ id: e.id, vocalized: text, gender: "", plural: "" }] : [];
          });
          if (items.length > 0) await supabase.rpc("fill_word_extras", { p_items: items });
        }
      } catch (error) {
        console.error("createSong nikud save failed", error);
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

  // Mark the request as filled and put the song in the requester's list. The song is already saved and
  // public, so if someone filled the request a moment earlier the song simply stays in the library.
  if (requestId) {
    const { error: fulfillError } = await supabase.rpc("fulfill_song_request", { p_request_id: requestId, p_song_id: songId });
    if (fulfillError) console.error("fulfill_song_request failed", fulfillError);
    revalidatePath("/requests");
  }

  return { songId };
}

export type SpotifySearchResult = { matches?: SpotifyMatch[]; error?: string };
export type YouTubeSearchResult = { matches?: YouTubeMatch[]; error?: string };

// A short, safe hint about an unexpected failure, so a problem can be diagnosed from the screen.
function hint(error: unknown) {
  return error instanceof Error && error.message ? ` (${error.message.slice(0, 120)})` : "";
}

// Both "Find on ..." buttons share these steps. Nothing in here is allowed to throw: any
// failure becomes a message in the form instead of crashing the page.
async function searchAs<T>(
  label: string,
  title: string,
  artist: string,
  search: (title: string, artist: string) => Promise<T[]>,
  isKnownError: (error: unknown) => boolean,
): Promise<{ matches?: T[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in again." };

    const t = title.trim().slice(0, 120);
    const a = artist.trim().slice(0, 120);
    if (!t) return { error: "Enter the song title first." };

    const matches = await search(t, a);
    if (matches.length === 0) return { error: `No matches found on ${label}. You can paste a link instead.` };
    return { matches };
  } catch (error) {
    if (isKnownError(error)) return { error: (error as Error).message };
    console.error(`findOn${label} failed`, error);
    return { error: `${label} search failed. Please try again.${hint(error)}` };
  }
}

// "Find on Spotify": suggest tracks for a title and artist.
export async function findOnSpotify(title: string, artist: string): Promise<SpotifySearchResult> {
  return searchAs("Spotify", title, artist, findTracks, (e) => e instanceof SpotifyError);
}

// "Find on YouTube": suggest videos for a title and artist.
export async function findOnYouTube(title: string, artist: string): Promise<YouTubeSearchResult> {
  return searchAs("YouTube", title, artist, findVideos, (e) => e instanceof YouTubeError);
}

// "Find the song": search a music catalog by title, to fill in the artist, album and cover art.
export async function findSongCatalog(query: string): Promise<{ matches?: SongMatch[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in again." };
    const q = query.trim().slice(0, 120);
    if (!q) return { matches: [] };
    return { matches: await searchSongs(q) };
  } catch (error) {
    if (error instanceof CatalogError) return { error: error.message };
    console.error("findSongCatalog failed", error);
    return { error: "The song search failed. You can enter the title and artist yourself." };
  }
}
