"use server";

import { createClient } from "@/lib/supabase/server";
import { getAIProvider, AIError } from "@/lib/ai";
import { hasHebrew, isSectionLabel } from "@/lib/lyrics";
import { pointAll } from "@/lib/nikud-run";
import { checkSongLinks, isMissingLinkColumn, songLinkColumns } from "@/lib/song-links";
import {
  MAX_ENGLISH,
  MAX_HEBREW,
  MAX_NOTE,
  MAX_PENDING_SUGGESTIONS,
  MAX_TITLE,
  MAX_TRANSLIT,
  decodeSuggestion,
  encodeSuggestion,
  type ActionResult,
  type AddedWord,
  type EditActions,
  type LineFields,
  type NikudResult,
  type SongDetails,
  type VocabDraft,
  type VocabRestore,
} from "@/lib/editing";
import type { SupabaseClient } from "@supabase/supabase-js";

// Every editing action runs here, on the server. Permissions are checked twice: in this code,
// and again by the database's row-level security, so a changed browser can't skip them.
// Nothing in here throws: a failure comes back as { ok: false, error } with a message for the screen.

const GENERIC = "Something went wrong. Please try again.";
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

type Ctx = { supabase: SupabaseClient; userId: string; isOwner: boolean; title: string };

async function context(songId: string): Promise<Ctx | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  const { data: song } = await supabase.from("songs").select("id, owner_id, title").eq("id", songId).maybeSingle();
  if (!song) return { error: "We couldn't find that song." };
  return { supabase, userId: user.id, isOwner: song.owner_id === user.id, title: song.title };
}

async function ownerContext(songId: string): Promise<Ctx | { error: string }> {
  const ctx = await context(songId);
  if ("error" in ctx) return ctx;
  if (!ctx.isOwner) return { error: "Only the person who added this song can edit it." };
  return ctx;
}

async function guarded<T extends object>(work: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await work();
  } catch (error) {
    console.error("edit action crashed", error);
    return fail(GENERIC);
  }
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------
export async function updateLine(songId: string, lineId: string, fields: LineFields) {
  return guarded<{ previous: LineFields }>(async () => {
    const english = fields.english.trim();
    const transliteration = fields.transliteration.trim();
    const hebrew = fields.hebrew.trim().replace(/\s+/g, " ");
    if (!hasHebrew(hebrew)) return fail("The Hebrew line needs some Hebrew text.");
    if (english.length > MAX_ENGLISH || transliteration.length > MAX_TRANSLIT || hebrew.length > MAX_HEBREW) {
      return fail("That text is too long.");
    }

    const ctx = await ownerContext(songId);
    if ("error" in ctx) return fail(ctx.error);

    const { data: before } = await ctx.supabase
      .from("lines")
      .select("english, transliteration, hebrew")
      .eq("id", lineId)
      .eq("song_id", songId)
      .maybeSingle();
    if (!before) return fail("We couldn't find that line.");

    const { error } = await ctx.supabase
      .from("lines")
      .update({ english: english || null, transliteration: transliteration || null, hebrew })
      .eq("id", lineId)
      .eq("song_id", songId);
    if (error) {
      console.error("updateLine failed", error);
      return fail(GENERIC);
    }
    // The saved nikud no longer matches if the Hebrew changed (ignored if that column isn't there yet).
    if (before.hebrew !== hebrew) {
      await ctx.supabase.from("lines").update({ vocalized: null }).eq("id", lineId).eq("song_id", songId);
    }
    return {
      ok: true,
      previous: { english: before.english ?? "", transliteration: before.transliteration ?? "", hebrew: before.hebrew },
    };
  });
}

// ---------------------------------------------------------------------------
// Nikud
// ---------------------------------------------------------------------------
// Adds nikud to every lyric line and vocabulary word of the song that doesn't have it yet.
export async function addNikud(songId: string) {
  return guarded<NikudResult>(async () => {
    const ctx = await ownerContext(songId);
    if ("error" in ctx) return fail(ctx.error);

    const linesRes = await ctx.supabase.from("lines").select("id, hebrew, vocalized").eq("song_id", songId).order("position");
    if (linesRes.error) {
      if (/vocalized/.test(linesRes.error.message)) return fail("Nikud for songs needs the latest database update, which hasn't been run yet.");
      console.error("addNikud lines failed", linesRes.error);
      return fail(GENERIC);
    }
    const lines = (linesRes.data ?? []).filter((l) => !l.vocalized && !isSectionLabel(l.hebrew) && hasHebrew(l.hebrew));

    const wordsRes = await ctx.supabase.from("song_words").select("vocab_entries(id, lemma, vocalized)").eq("song_id", songId);
    const wordEntries = (wordsRes.data ?? []).flatMap((row) => {
      const v = (Array.isArray(row.vocab_entries) ? row.vocab_entries[0] : row.vocab_entries) as { id: string; lemma: string; vocalized: string | null } | undefined;
      return v && !v.vocalized ? [v] : [];
    });

    if (lines.length === 0 && wordEntries.length === 0) return fail("This song already has nikud.");

    const texts = [...lines.map((l) => l.hebrew), ...wordEntries.map((w) => w.lemma)];
    const { answers, usage, lastError } = await pointAll(getAIProvider(), texts);

    const out: NikudResult = { lines: [], words: [], skipped: 0, usage };
    lines.forEach((l, i) => {
      const text = answers[i];
      if (text) out.lines.push({ id: l.id, vocalized: text });
    });
    wordEntries.forEach((w, i) => {
      const text = answers[lines.length + i];
      if (text) out.words.push({ id: w.id, vocalized: text });
    });
    out.skipped = texts.length - out.lines.length - out.words.length;
    if (out.lines.length === 0 && out.words.length === 0) {
      const failure = { ok: false as const, error: lastError || "Claude's answer didn't match the lyrics, so nothing was changed. Please try again.", usage };
      return failure;
    }

    const results = await Promise.all(out.lines.map((l) => ctx.supabase.from("lines").update({ vocalized: l.vocalized }).eq("id", l.id).eq("song_id", songId)));
    if (results.some((r) => r.error)) {
      console.error("addNikud save failed", results.find((r) => r.error)?.error);
      return fail(GENERIC);
    }
    if (out.words.length > 0) {
      const { error } = await ctx.supabase.rpc("fill_word_extras", { p_items: out.words.map((w) => ({ id: w.id, vocalized: w.vocalized, gender: "", plural: "" })) });
      if (error) console.error("fill_word_extras failed", error);
    }
    return { ok: true, ...out };
  });
}

// ---------------------------------------------------------------------------
// Song vocabulary
// ---------------------------------------------------------------------------
export async function suggestWord(songId: string, lineId: string, token: string) {
  return guarded<{ draft: VocabDraft }>(async () => {
    const word = token.trim();
    if (!word || !hasHebrew(word) || word.length > 40) return fail("Tap a Hebrew word.");
    const ctx = await ownerContext(songId);
    if ("error" in ctx) return fail(ctx.error);

    const { data: line } = await ctx.supabase.from("lines").select("hebrew").eq("id", lineId).eq("song_id", songId).maybeSingle();
    if (!line) return fail("We couldn't find that line.");

    try {
      const r = await getAIProvider().defineWord({ word, line: line.hebrew, title: ctx.title });
      return {
        ok: true,
        draft: { lemma: r.lemma, transliteration: r.transliteration, english: r.english, partOfSpeech: r.part_of_speech },
      };
    } catch (error) {
      if (error instanceof AIError) return fail(error.message);
      throw error;
    }
  });
}

export async function addVocabulary(songId: string, lineId: string, token: string, draft: VocabDraft) {
  return guarded<{ word: AddedWord }>(async () => {
    const lemma = draft.lemma.trim();
    const english = draft.english.trim();
    const transliteration = draft.transliteration.trim();
    const partOfSpeech = draft.partOfSpeech.trim();
    if (!hasHebrew(lemma)) return fail("The dictionary form needs Hebrew letters.");
    if (!english) return fail("Please add the English meaning.");
    if (lemma.length > 60 || english.length > 100 || transliteration.length > 100 || partOfSpeech.length > 40) {
      return fail("That text is too long.");
    }

    const ctx = await ownerContext(songId);
    if ("error" in ctx) return fail(ctx.error);

    const { data: line } = await ctx.supabase.from("lines").select("id").eq("id", lineId).eq("song_id", songId).maybeSingle();

    // The shared dictionary: reuse the word if it already exists, otherwise add it.
    const { error: upsertError } = await ctx.supabase.from("vocab_entries").upsert(
      { lemma, english, transliteration: transliteration || null, part_of_speech: partOfSpeech || null },
      { onConflict: "lemma,english", ignoreDuplicates: true },
    );
    if (upsertError) {
      console.error("addVocabulary upsert failed", upsertError);
      return fail(GENERIC);
    }
    const { data: entry } = await ctx.supabase
      .from("vocab_entries")
      .select("id, lemma, transliteration, english, part_of_speech")
      .eq("lemma", lemma)
      .eq("english", english)
      .maybeSingle();
    if (!entry) return fail(GENERIC);

    const { data: existing } = await ctx.supabase
      .from("song_words")
      .select("vocab_entry_id")
      .eq("song_id", songId)
      .eq("vocab_entry_id", entry.id)
      .maybeSingle();
    if (existing) return fail("That word is already in this song's vocabulary.");

    const surfaceForm = token.trim() || lemma;
    const { error } = await ctx.supabase.from("song_words").insert({
      song_id: songId,
      vocab_entry_id: entry.id,
      surface_form: surfaceForm,
      line_id: line?.id ?? null,
      source: "user",
    });
    if (error) {
      console.error("addVocabulary insert failed", error);
      return fail(GENERIC);
    }

    // If the person has met this word before (another song), it keeps its status.
    const { data: progress } = await ctx.supabase
      .from("user_words")
      .select("correct_count, learned_at")
      .eq("vocab_entry_id", entry.id)
      .maybeSingle();
    return {
      ok: true,
      word: {
        vocabId: entry.id,
        lemma: entry.lemma,
        transliteration: entry.transliteration,
        english: entry.english,
        partOfSpeech: entry.part_of_speech,
        surfaceForm,
        lineId: line?.id ?? null,
        status: progress ? (progress.learned_at ? "learned" : "learning") : "new",
        count: progress?.correct_count ?? 0,
      },
    };
  });
}

export async function removeVocabulary(songId: string, vocabId: string) {
  return guarded<{ restore: VocabRestore }>(async () => {
    const ctx = await ownerContext(songId);
    if ("error" in ctx) return fail(ctx.error);

    const { data: row } = await ctx.supabase
      .from("song_words")
      .select("vocab_entry_id, surface_form, line_id, source")
      .eq("song_id", songId)
      .eq("vocab_entry_id", vocabId)
      .maybeSingle();
    if (!row) return fail("That word isn't in this song's vocabulary.");

    const { error } = await ctx.supabase.from("song_words").delete().eq("song_id", songId).eq("vocab_entry_id", vocabId);
    if (error) {
      console.error("removeVocabulary failed", error);
      return fail(GENERIC);
    }
    return { ok: true, restore: { vocabId, surfaceForm: row.surface_form, lineId: row.line_id, source: row.source } };
  });
}

export async function restoreVocabulary(songId: string, restore: VocabRestore) {
  return guarded<object>(async () => {
    const ctx = await ownerContext(songId);
    if ("error" in ctx) return fail(ctx.error);
    const { error } = await ctx.supabase.from("song_words").upsert(
      {
        song_id: songId,
        vocab_entry_id: restore.vocabId,
        surface_form: restore.surfaceForm,
        line_id: restore.lineId,
        source: restore.source === "ai" ? "ai" : "user",
      },
      { onConflict: "song_id,vocab_entry_id", ignoreDuplicates: true },
    );
    if (error) {
      console.error("restoreVocabulary failed", error);
      return fail(GENERIC);
    }
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Song details
// ---------------------------------------------------------------------------
export async function updateSongDetails(songId: string, details: SongDetails) {
  return guarded<{ previous: SongDetails }>(async () => {
    const title = details.title.trim();
    const artist = details.artist.trim();
    if (!title) return fail("Please give the song a title.");
    if (title.length > MAX_TITLE || artist.length > MAX_TITLE) return fail("Title and artist must be under 120 characters.");
    const links = checkSongLinks({ spotify: details.spotifyUrl, youtube: details.youtubeUrl, cover: details.coverUrl, album: details.album });
    if ("error" in links) return fail(links.error);
    const columns = songLinkColumns(links);

    const ctx = await ownerContext(songId);
    if ("error" in ctx) return fail(ctx.error);

    // What it was before (for Undo). Newer columns may not exist yet, so fall back to the old single link.
    let previous: SongDetails | null = null;
    const ext = await ctx.supabase.from("songs").select("title, artist, spotify_url, youtube_url, album, cover_url").eq("id", songId).maybeSingle();
    if (!ext.error && ext.data) {
      previous = {
        title: ext.data.title,
        artist: ext.data.artist ?? "",
        spotifyUrl: ext.data.spotify_url ?? "",
        youtubeUrl: ext.data.youtube_url ?? "",
        album: ext.data.album ?? "",
        coverUrl: ext.data.cover_url ?? "",
      };
    } else {
      const old = await ctx.supabase.from("songs").select("title, artist, media_url, media_type").eq("id", songId).maybeSingle();
      if (!old.data) return fail("We couldn't find that song.");
      previous = {
        title: old.data.title,
        artist: old.data.artist ?? "",
        spotifyUrl: old.data.media_type === "spotify" ? (old.data.media_url ?? "") : "",
        youtubeUrl: old.data.media_type === "youtube" ? (old.data.media_url ?? "") : "",
        album: "",
        coverUrl: "",
      };
    }

    const base = { title, artist: artist || null };
    let result = await ctx.supabase.from("songs").update({ ...base, ...columns.extended }).eq("id", songId);
    if (result.error && isMissingLinkColumn(result.error)) {
      result = await ctx.supabase.from("songs").update({ ...base, ...columns.legacy }).eq("id", songId);
    }
    if (result.error) {
      console.error("updateSongDetails failed", result.error);
      return fail(GENERIC);
    }
    return { ok: true, previous };
  });
}

// ---------------------------------------------------------------------------
// Suggestions from other people
// ---------------------------------------------------------------------------
export async function suggestLineChange(songId: string, lineId: string, text: string, note: string) {
  return guarded<object>(async () => {
    const proposed = text.trim();
    const why = note.trim();
    if (!proposed) return fail("Please write your suggested English.");
    if (proposed.length > MAX_ENGLISH || why.length > MAX_NOTE) return fail("That text is too long.");

    const ctx = await context(songId);
    if ("error" in ctx) return fail(ctx.error);
    if (ctx.isOwner) return fail("You can edit your own songs directly.");

    const { data: line } = await ctx.supabase.from("lines").select("english").eq("id", lineId).eq("song_id", songId).maybeSingle();
    if (!line) return fail("We couldn't find that line.");
    if ((line.english ?? "").trim().toLowerCase() === proposed.toLowerCase()) {
      return fail("That's the same as the current translation.");
    }

    const { count } = await ctx.supabase
      .from("edit_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("song_id", songId)
      .eq("suggested_by", ctx.userId)
      .eq("status", "pending");
    if ((count ?? 0) >= MAX_PENDING_SUGGESTIONS) {
      return fail("You already have several suggestions waiting for this song. Please wait for the owner to review them.");
    }

    const { error } = await ctx.supabase.from("edit_suggestions").insert({
      song_id: songId,
      suggested_by: ctx.userId,
      kind: "line_translation",
      line_id: lineId,
      proposed_value: encodeSuggestion(proposed, why),
    });
    if (error) {
      console.error("suggestLineChange failed", error);
      return fail(GENERIC);
    }
    return { ok: true };
  });
}

export async function resolveSuggestion(songId: string, suggestionId: string, decision: "approve" | "reject") {
  return guarded<{ lineId: string; previousEnglish: string | null; text: string }>(async () => {
    const ctx = await ownerContext(songId);
    if ("error" in ctx) return fail(ctx.error);

    const { data: suggestion } = await ctx.supabase
      .from("edit_suggestions")
      .select("id, line_id, proposed_value, status")
      .eq("id", suggestionId)
      .eq("song_id", songId)
      .maybeSingle();
    if (!suggestion || suggestion.status !== "pending" || !suggestion.line_id) {
      return fail("That suggestion has already been handled.");
    }
    const { text } = decodeSuggestion(suggestion.proposed_value);

    let previousEnglish: string | null = null;
    if (decision === "approve") {
      const { data: line } = await ctx.supabase.from("lines").select("english").eq("id", suggestion.line_id).eq("song_id", songId).maybeSingle();
      if (!line) return fail("That line no longer exists.");
      previousEnglish = line.english ?? null;
      const { error: lineError } = await ctx.supabase.from("lines").update({ english: text }).eq("id", suggestion.line_id).eq("song_id", songId);
      if (lineError) {
        console.error("approve: line update failed", lineError);
        return fail(GENERIC);
      }
    }

    const { error } = await ctx.supabase
      .from("edit_suggestions")
      .update({ status: decision === "approve" ? "approved" : "rejected", resolved_at: new Date().toISOString() })
      .eq("id", suggestionId);
    if (error) {
      console.error("resolveSuggestion failed", error);
      return fail(GENERIC);
    }
    return { ok: true, lineId: suggestion.line_id, previousEnglish, text };
  });
}

export async function reopenSuggestion(
  songId: string,
  suggestionId: string,
  lineId: string,
  previousEnglish: string | null,
  restoreLine: boolean,
) {
  return guarded<object>(async () => {
    const ctx = await ownerContext(songId);
    if ("error" in ctx) return fail(ctx.error);
    if (restoreLine) {
      const { error } = await ctx.supabase.from("lines").update({ english: previousEnglish }).eq("id", lineId).eq("song_id", songId);
      if (error) {
        console.error("reopen: line restore failed", error);
        return fail(GENERIC);
      }
    }
    const { error } = await ctx.supabase.from("edit_suggestions").update({ status: "pending", resolved_at: null }).eq("id", suggestionId).eq("song_id", songId);
    if (error) {
      console.error("reopenSuggestion failed", error);
      return fail(GENERIC);
    }
    return { ok: true };
  });
}

// A compile-time check that these actions match the shape the screens expect.
const _check: EditActions = {
  addNikud,
  updateLine,
  suggestWord,
  addVocabulary,
  removeVocabulary,
  restoreVocabulary,
  updateSongDetails,
  suggestLineChange,
  resolveSuggestion,
  reopenSuggestion,
};
void _check;
