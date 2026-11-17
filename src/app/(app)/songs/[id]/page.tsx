import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseMedia } from "@/lib/media";
import { loadSettings } from "@/lib/settings";
import { chunk, fingerprint } from "@/lib/study";
import { SongView, type SongLine, type SongWord } from "./song-view";
import { SongActions } from "./song-actions";
import { QuizStartButton } from "./quiz-start-button";
import { AddSongButton } from "./add-song-button";
import { prepareQuiz } from "./quiz/actions";

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
  const [songRes, linesRes, wordsRes, settings, attemptsRes, mineRes] = await Promise.all([
    supabase.from("songs").select("id, title, artist, media_url, visibility, owner_id").eq("id", id).maybeSingle(),
    supabase.from("lines").select("id, hebrew, transliteration, english").eq("song_id", id).order("position"),
    supabase
      .from("song_words")
      .select("surface_form, vocab_entries(id, lemma, transliteration, english, part_of_speech)")
      .eq("song_id", id),
    loadSettings(supabase, user.id),
    supabase.from("quiz_attempts").select("score, total").eq("song_id", id).order("taken_at", { ascending: false }).limit(50),
    supabase.from("user_songs").select("song_id").eq("song_id", id).maybeSingle(),
  ]);

  // A real database error is not the same as "no such song": surface it instead of a 404.
  if (songRes.error) throw new Error(`song lookup failed: ${songRes.error.message}`);
  const song = songRes.data;
  if (!song) notFound();

  const lines: SongLine[] = linesRes.data ?? [];
  const entries = (wordsRes.data ?? []).flatMap((row) => {
    const entry = Array.isArray(row.vocab_entries) ? row.vocab_entries[0] : row.vocab_entries;
    return entry ? [{ ...entry, surface_form: row.surface_form }] : [];
  });

  // Where the person stands with each of this song's words (New / Learning / Learned).
  const progress = new Map<string, { correct_count: number; learned_at: string | null }>();
  for (const ids of chunk(entries.map((e) => e.id as string), 60)) {
    const { data } = await supabase.from("user_words").select("vocab_entry_id, correct_count, learned_at").in("vocab_entry_id", ids);
    for (const p of data ?? []) progress.set(p.vocab_entry_id, p);
  }
  const words: SongWord[] = entries.map((e) => {
    const p = progress.get(e.id);
    return { ...e, status: p ? (p.learned_at ? "learned" : "learning") : "new", count: p?.correct_count ?? 0 };
  });
  const learnedCount = words.filter((w) => w.status === "learned").length;
  const toLearn = words.length - learnedCount;
  const media = parseMedia(song.media_url);
  const isOwner = song.owner_id === user.id;
  const inMyList = Boolean(mineRes.data);
  // The sharer's name is a separate, optional lookup, so it can never break the page.
  let sharedBy: string | null = null;
  if (!isOwner) {
    const { data: owner } = await supabase.from("profiles").select("display_name").eq("id", song.owner_id).maybeSingle();
    if (owner?.display_name) sharedBy = `Shared by ${owner.display_name}`;
  }
  const attempts = attemptsRes.data ?? [];
  const best = attempts.reduce<{ score: number; total: number } | null>(
    (b, a) => (!b || a.score / a.total > b.score / b.total ? a : b),
    null,
  );

  return (
    <>
      <header className="flex flex-col gap-1">
        <Link href={inMyList ? "/songs" : "/library"} className="text-sm text-muted underline underline-offset-4">
          {inMyList ? "← My songs" : "← Library"}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{song.title}</h1>
        <p className="text-sm text-muted">
          {[song.artist, song.visibility === "public" ? "Public" : "Private", sharedBy].filter(Boolean).join(" · ")}
        </p>
      </header>

      {!inMyList && <AddSongButton songId={song.id} />}

      {media && (
        <iframe
          title={`${media.type === "spotify" ? "Spotify" : "YouTube"} player`}
          src={media.embedUrl}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className={`w-full rounded-xl border-0 ${media.type === "spotify" ? "h-[152px]" : "aspect-video"}`}
        />
      )}
      {media && (
        <p className="-mt-3 text-sm text-muted">
          {media.type === "spotify" && "The player here may play only a 30-second preview. "}
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4"
          >
            Open the full song in {media.type === "spotify" ? "Spotify" : "YouTube"} ↗
          </a>
        </p>
      )}

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
        key={fingerprint(words.flatMap((w) => [w.id, w.status, w.count]))}
        lines={lines}
        words={words}
        showTranslit={settings.showTranslit}
        learnAfter={settings.learnAfter}
      />

      <SongActions songId={song.id} isOwner={isOwner} isPublic={song.visibility === "public"} inMyList={inMyList} />
    </>
  );
}
