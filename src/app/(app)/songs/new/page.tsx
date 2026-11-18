import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewSongForm, type FilledRequest } from "./new-song-form";

export const metadata = { title: "Add lyrics · milim" };

// Translating a full song can take a while.
export const maxDuration = 60;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function NewSongPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Add lyrics</h1>
        <Link href="/songs" className="text-sm text-muted underline underline-offset-4">
          Cancel
        </Link>
      </header>
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// With ?request=ID the form is filled in from that song request (title, artist, cover art, links).
async function Body({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const { request: requestId } = await searchParams;
  let request: FilledRequest | null = null;
  let notice = "";
  if (requestId && uuid.test(requestId)) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("song_requests")
      .select("id, title, artist, album, cover_url, spotify_url, youtube_url, status, requester_id")
      .eq("id", requestId)
      .maybeSingle();
    if (!data || data.status !== "open") {
      notice = "That request was already filled or cancelled. You can still add a song of your own below.";
    } else {
      const { data: who } = await supabase.from("profiles").select("display_name").eq("id", data.requester_id).maybeSingle();
      request = {
        id: data.id,
        requesterName: who?.display_name ?? null,
        mine: Boolean(user && user.id === data.requester_id),
        title: data.title,
        artist: data.artist ?? "",
        album: data.album ?? "",
        coverUrl: data.cover_url ?? null,
        spotifyUrl: data.spotify_url ?? "",
        youtubeUrl: data.youtube_url ?? "",
      };
    }
  }
  return (
    <>
      {notice && <p className="rounded-xl border border-border bg-surface p-3 text-sm text-muted">{notice}</p>}
      <NewSongForm request={request} />
    </>
  );
}
