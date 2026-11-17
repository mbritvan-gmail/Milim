import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseMedia } from "@/lib/media";
import { SongView, type SongLine, type SongWord } from "./song-view";
import { SongActions } from "./song-actions";
import { QuizStartButton } from "./quiz-start-button";
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
  const [songRes, linesRes, wordsRes, profileRes, attemptsRes] = await Promise.all([
    supabase.from("songs").select("id, title, artist, media_url, visibility, owner_id").eq("id", id).maybeSingle(),
    supabase.from("lines").select("id, hebrew, transliteration, english").eq("song_id", id).order("position"),
    supabase
      .from("song_words")
      .select("surface_form, vocab_entries(id, lemma, transliteration, english, part_of_speech)")
      .eq("song_id", id),
    supabase.from("profiles").select("show_transliteration").eq("id", user.id).maybeSingle(),
    supabase.from("quiz_attempts").select("score, total").eq("song_id", id).order("taken_at", { ascending: false }).limit(50),
  ]);

  const song = songRes.data;
  if (!song) notFound();

  const lines: SongLine[] = linesRes.data ?? [];
  const words: SongWord[] = (wordsRes.data ?? []).flatMap((row) => {
    const entry = Array.isArray(row.vocab_entries) ? row.vocab_entries[0] : row.vocab_entries;
    return entry ? [{ ...entry, surface_form: row.surface_form }] : [];
  });
  const media = parseMedia(song.media_url);
  const attempts = attemptsRes.data ?? [];
  const best = attempts.reduce<{ score: number; total: number } | null>(
    (b, a) => (!b || a.score / a.total > b.score / b.total ? a : b),
    null,
  );

  return (
    <>
      <header className="flex flex-col gap-1">
        <Link href="/songs" className="text-sm text-muted underline underline-offset-4">
          ← My songs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{song.title}</h1>
        <p className="text-sm text-muted">
          {[song.artist, song.visibility === "public" ? "Public" : "Private"].filter(Boolean).join(" · ")}
        </p>
      </header>

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

      <section aria-label="Quiz" className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold">Practice</h2>
        {words.length === 0 ? (
          <p className="text-sm text-muted">This song has no key words yet, so there&apos;s nothing to quiz.</p>
        ) : (
          <>
            <p className="text-sm text-muted">
              {attempts.length === 0
                ? `Test yourself on ${words.length} key words.`
                : `Best score ${best!.score}/${best!.total} · ${attempts.length} ${attempts.length === 1 ? "attempt" : "attempts"}`}
            </p>
            <form action={prepareQuiz.bind(null, song.id)}>
              <QuizStartButton label={attempts.length === 0 ? "Take the quiz" : "Take the quiz again"} />
            </form>
          </>
        )}
      </section>

      <SongView lines={lines} words={words} initialShowTranslit={profileRes.data?.show_transliteration ?? true} />

      <SongActions songId={song.id} isOwner={song.owner_id === user.id} isPublic={song.visibility === "public"} />
    </>
  );
}
