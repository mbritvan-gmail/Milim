import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseMedia } from "@/lib/media";
import { SongPlayer } from "@/components/song-player";
import { Cover } from "@/components/song-links";
import { CloseButton } from "@/components/overlay";
import { loadSettings } from "@/lib/settings";
import { chunk, fingerprint } from "@/lib/study";
import { SongView, type SongLine, type SongWord } from "./song-view";
import { QuizStartButton } from "./quiz-start-button";
import { AddSongButton } from "./add-song-button";
import { prepareQuiz } from "./quiz/actions";
import { loadWordExtras } from "@/lib/word-extras";
import { decodeSuggestion, type EditActions, type PendingSuggestion } from "@/lib/editing";
import { EditModeProvider } from "@/components/edit-mode";
import { SongHeaderControls } from "./song-header-controls";
import * as editActionModule from "./edit-actions";

// Server actions handed to the screen as a plain object (so tests can swap in stand-ins).
const editActions: EditActions = {
  addNikud: editActionModule.addNikud,
  updateLine: editActionModule.updateLine,
  suggestWord: editActionModule.suggestWord,
  addVocabulary: editActionModule.addVocabulary,
  removeVocabulary: editActionModule.removeVocabulary,
  restoreVocabulary: editActionModule.restoreVocabulary,
  updateSongDetails: editActionModule.updateSongDetails,
  suggestLineChange: editActionModule.suggestLineChange,
  resolveSuggestion: editActionModule.resolveSuggestion,
  reopenSuggestion: editActionModule.reopenSuggestion,
};

export const metadata = { title: "Song · milim" };

// Preparing quiz answers with the AI the first time can take a little while.
export const maxDuration = 60;

export default function SongPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <SongBody params={params} />
      </Suspense>
    </main>
  );
}

async function SongBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Row-level security decides what this user may see; a song they can't see is
  // simply "not found".
  const [songRes, extrasRes, linesRes, nikudRes, wordsRes, settings, attemptsRes, mineRes] = await Promise.all([
    supabase.from("songs").select("id, title, artist, media_url, media_type, visibility, owner_id").eq("id", id).maybeSingle(),
    // Two links and album art live in newer columns; if the database script for them isn't run yet this comes back empty.
    supabase.from("songs").select("spotify_url, youtube_url, album, cover_url").eq("id", id).maybeSingle(),
    supabase.from("lines").select("id, hebrew, transliteration, english").eq("song_id", id).order("position"),
    // Nikud for each line lives in a newer column; if the database script isn't run yet this just comes back empty.
    supabase.from("lines").select("id, vocalized").eq("song_id", id),
    supabase
      .from("song_words")
      .select("surface_form, line_id, source, vocab_entries(id, lemma, transliteration, english, part_of_speech)")
      .eq("song_id", id),
    loadSettings(supabase, user.id),
    supabase.from("quiz_attempts").select("score, total").eq("song_id", id).order("taken_at", { ascending: false }).limit(50),
    supabase.from("user_songs").select("song_id").eq("song_id", id).maybeSingle(),
  ]);

  // A real database error is not the same as "no such song": surface it instead of a 404.
  if (songRes.error) throw new Error(`song lookup failed: ${songRes.error.message}`);
  const song = songRes.data;
  if (!song) notFound();

  const nikudByLine = new Map((nikudRes.error ? [] : (nikudRes.data ?? [])).map((r) => [r.id as string, (r.vocalized as string | null) ?? null]));
  const lines: SongLine[] = (linesRes.data ?? []).map((l) => ({ ...l, vocalized: nikudByLine.get(l.id) ?? null }));
  const entries = (wordsRes.data ?? []).flatMap((row) => {
    const entry = Array.isArray(row.vocab_entries) ? row.vocab_entries[0] : row.vocab_entries;
    return entry ? [{ ...entry, surface_form: row.surface_form, line_id: row.line_id as string | null, source: (row.source as string | null) ?? "ai" }] : [];
  });

  // Where the person stands with each of this song's words (New / Learning / Learned).
  const progress = new Map<string, { correct_count: number; learned_at: string | null }>();
  for (const ids of chunk(entries.map((e) => e.id as string), 60)) {
    const { data } = await supabase.from("user_words").select("vocab_entry_id, correct_count, learned_at").in("vocab_entry_id", ids);
    for (const p of data ?? []) progress.set(p.vocab_entry_id, p);
  }
  const extras = await loadWordExtras(supabase, entries.map((e) => e.id as string));
  const words: SongWord[] = entries.map((e) => {
    const p = progress.get(e.id);
    return { ...e, vocalized: extras.get(e.id as string)?.vocalized ?? null, status: p ? (p.learned_at ? "learned" : "learning") : "new", count: p?.correct_count ?? 0 };
  });
  const learnedCount = words.filter((w) => w.status === "learned").length;
  const toLearn = words.length - learnedCount;
  // The two player links: the new columns, or the old single link in the matching slot.
  const extra = extrasRes.error ? null : extrasRes.data;
  const spotifyUrl = extra?.spotify_url ?? (song.media_type === "spotify" ? song.media_url : null);
  const youtubeUrl = extra?.youtube_url ?? (song.media_type === "youtube" ? song.media_url : null);
  const spotifyMedia = parseMedia(spotifyUrl);
  const youtubeMedia = parseMedia(youtubeUrl);
  const coverUrl: string | null = extra?.cover_url ?? null;
  const album: string | null = extra?.album ?? null;
  const isOwner = song.owner_id === user.id;
  const inMyList = Boolean(mineRes.data);
  // The sharer's name is a separate, optional lookup, so it can never break the page.
  let sharedBy: string | null = null;
  if (!isOwner) {
    const { data: owner } = await supabase.from("profiles").select("display_name").eq("id", song.owner_id).maybeSingle();
    if (owner?.display_name) sharedBy = `Shared by ${owner.display_name}`;
  }
  // Waiting suggestions are only loaded for the owner, who reviews them on this page.
  let pending: PendingSuggestion[] = [];
  if (isOwner) {
    const { data: rows } = await supabase
      .from("edit_suggestions")
      .select("id, line_id, suggested_by, proposed_value")
      .eq("song_id", id)
      .eq("kind", "line_translation")
      .eq("status", "pending")
      .order("created_at");
    const byIds = [...new Set((rows ?? []).map((r) => r.suggested_by as string))];
    const names = new Map<string, string>();
    if (byIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", byIds);
      for (const p of profs ?? []) if (p.display_name) names.set(p.id, p.display_name);
    }
    pending = (rows ?? []).flatMap((r) => {
      if (!r.line_id) return [];
      const { text, note } = decodeSuggestion(r.proposed_value);
      return [{ id: r.id as string, lineId: r.line_id as string, by: names.get(r.suggested_by as string) ?? "a listener", text, note }];
    });
  }
  const attempts = attemptsRes.data ?? [];
  const best = attempts.reduce<{ score: number; total: number } | null>(
    (b, a) => (!b || a.score / a.total > b.score / b.total ? a : b),
    null,
  );

  return (
    <EditModeProvider>
      <header className="flex items-start gap-4">
        {coverUrl && <Cover url={coverUrl} size={84} />}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-[8rem] flex-1 text-2xl font-semibold">{song.title}</h1>
          <div className="ml-auto flex items-center gap-2">
            {(isOwner || song.visibility === "public") && (
              <SongHeaderControls songId={song.id} isOwner={isOwner} isPublic={song.visibility === "public"} canRemove={isOwner || inMyList} />
            )}
            <CloseButton fallbackHref={inMyList ? "/songs" : "/library"} />
          </div>
        </div>
        <p className="text-sm text-muted">
          {[song.artist, album, song.visibility === "public" ? "Public" : "Private", sharedBy].filter(Boolean).join(" · ")}
        </p>
        </div>
      </header>

      {!inMyList && <AddSongButton songId={song.id} />}

      <SongPlayer spotify={spotifyMedia} youtube={youtubeMedia} preferred={settings.preferredPlayer} />

      {inMyList && (
      <section aria-label="Quiz" className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold">Practice</h2>
        {words.length === 0 ? (
          <p className="text-sm text-muted">This song has no vocabulary yet, so there&apos;s nothing to study.</p>
        ) : (
          <>
            <p className="text-sm text-muted">
              {toLearn === 0 ? "Every word in this song's vocabulary is learned." : `${toLearn} of ${words.length} vocabulary words still to learn`}
              {best ? ` · Best quiz ${best.score}/${best.total}` : ""}
            </p>
            <div className="flex gap-2">
              {toLearn > 0 ? (
                <Link
                  href={`/flashcards?song=${song.id}&scope=unlearned`}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong"
                >
                  Study {toLearn} {toLearn === 1 ? "word" : "words"}
                </Link>
              ) : (
                <span className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border text-sm text-muted">All learned</span>
              )}
              <form action={prepareQuiz.bind(null, song.id)} className="flex-1">
                <QuizStartButton label={attempts.length === 0 ? "Take the quiz" : "Quiz again"} />
              </form>
            </div>
            {learnedCount > 0 && (
              <Link
                href={`/flashcards?song=${song.id}&scope=learned`}
                className="self-start text-xs text-muted underline underline-offset-2 hover:text-foreground"
              >
                Review the {learnedCount} learned {learnedCount === 1 ? "word" : "words"}
              </Link>
            )}
          </>
        )}
      </section>
      )}

      <SongView
        key={fingerprint([...words.flatMap((w) => [w.id, w.status, w.count]), ...lines.flatMap((l) => [l.id, l.hebrew, l.english ?? "", l.transliteration ?? "", l.vocalized ?? ""]), ...words.map((w) => w.vocalized ?? ""), ...pending.map((p) => p.id), song.title, song.artist ?? "", spotifyUrl ?? "", youtubeUrl ?? "", coverUrl ?? "", album ?? "", settings.showTranslit, settings.showNikud, settings.learnAfter])}
        songId={song.id}
        isOwner={isOwner}
        canSuggest={!isOwner && song.visibility === "public"}
        details={{ title: song.title, artist: song.artist ?? "", spotifyUrl: spotifyUrl ?? "", youtubeUrl: youtubeUrl ?? "", album: album ?? "", coverUrl: coverUrl ?? "" }}
        pending={pending}
        actions={editActions}
        lines={lines}
        words={words}
        showTranslit={settings.showTranslit}
        showNikud={settings.showNikud}
        learnAfter={settings.learnAfter}
      />

    </EditModeProvider>
  );
}
