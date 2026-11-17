import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SongsTabs } from "@/components/songs-tabs";
import { SongsList, type ListSong } from "./songs-list";

export const metadata = { title: "Songs · milim" };

export default function SongsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <SongsBody />
      </Suspense>
    </main>
  );
}

async function SongsBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already redirects signed-out visitors; this is a second check.
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("user_songs")
    .select("added_at, songs(id, title, artist, visibility, owner_id)")
    .order("added_at", { ascending: false });

  const songs: ListSong[] = (rows ?? []).flatMap((row) => {
    const song = Array.isArray(row.songs) ? row.songs[0] : row.songs;
    return song
      ? [{ id: song.id, title: song.title, artist: song.artist, visibility: song.visibility === "public" ? ("public" as const) : ("private" as const), isOwner: song.owner_id === user.id }]
      : [];
  });

  return (
    <SongsList songs={songs} tabs={<SongsTabs active="mine" />} />
  );
}
