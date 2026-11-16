import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseMedia } from "@/lib/media";
import { SongView, type SongLine, type SongWord } from "./song-view";
import { SongActions } from "./song-actions";

export const metadata = { title: "Song · Milim" };

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
  const [songRes, linesRes, wordsRes, profileRes] = await Promise.all([
    supabase.from("songs").select("id, title, artist, media_url, visibility, owner_id").eq("id", id).maybeSingle(),
    supabase.from("lines").select("id, hebrew, transliteration, english").eq("song_id", id).order("position"),
    supabase
      .from("song_words")
      .select("surface_form, vocab_entries(id, lemma, transliteration, english, part_of_speech)")
      .eq("song_id", id),
    supabase.from("profiles").select("show_transliteration").eq("id", user.id).maybeSingle(),
  ]);

  const song = songRes.data;
  if (!song) notFound();

  const lines: SongLine[] = linesRes.data ?? [];
  const words: SongWord[] = (wordsRes.data ?? []).flatMap((row) => {
    const entry = Array.isArray(row.vocab_entries) ? row.vocab_entries[0] : row.vocab_entries;
    return entry ? [{ ...entry, surface_form: row.surface_form }] : [];
  });
  const media = parseMedia(song.media_url);

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

      <SongView lines={lines} words={words} initialShowTranslit={profileRes.data?.show_transliteration ?? true} />

      <SongActions songId={song.id} isOwner={song.owner_id === user.id} isPublic={song.visibility === "public"} />
    </>
  );
}
