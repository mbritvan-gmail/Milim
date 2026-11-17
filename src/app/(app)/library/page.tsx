import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SongsTabs } from "@/components/songs-tabs";
import { fingerprint } from "@/lib/study";
import { LibraryList, type LibrarySong } from "./library-list";

export const metadata = { title: "Public library · milim" };

export default function LibraryPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading the library…</p>}>
        <LibraryBody />
      </Suspense>
    </main>
  );
}

async function LibraryBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Every public song that hasn't been archived, newest first. Row-level security allows
  // reading public songs for any signed-in user.
  const [songsRes, mineRes] = await Promise.all([
    supabase
      .from("songs")
      .select("id, title, artist, owner_id")
      .eq("visibility", "public")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("user_songs").select("song_id"),
  ]);

  if (songsRes.error) throw new Error(`library lookup failed: ${songsRes.error.message}`);

  // Look up who shared each song in a separate, optional step.
  const rows = songsRes.data ?? [];
  const ownerIds = [...new Set(rows.map((s) => s.owner_id as string))];
  const { data: owners } = ownerIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", ownerIds)
    : { data: [] };
  const nameById = new Map((owners ?? []).map((o) => [o.id as string, o.display_name as string | null]));

  const mine = new Set((mineRes.data ?? []).map((r) => r.song_id as string));
  const songs: LibrarySong[] = rows.map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    sharedBy: nameById.get(s.owner_id) ?? null,
    isOwn: s.owner_id === user.id,
    added: mine.has(s.id),
  }));

  return (
    <>
      <h1 className="text-2xl font-semibold">Songs</h1>
      <SongsTabs active="library" />
      <LibraryList key={fingerprint(songs.flatMap((s) => [s.id, s.added]))} initialSongs={songs} />
    </>
  );
}
