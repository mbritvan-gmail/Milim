import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LibraryList, type LibrarySong } from "./library-list";

export const metadata = { title: "Library · milim" };

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
      .select("id, title, artist, owner_id, profiles(display_name)")
      .eq("visibility", "public")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("user_songs").select("song_id"),
  ]);

  const mine = new Set((mineRes.data ?? []).map((r) => r.song_id as string));
  const songs: LibrarySong[] = (songsRes.data ?? []).map((s) => {
    const owner = (Array.isArray(s.profiles) ? s.profiles[0] : s.profiles) as { display_name: string | null } | null;
    return {
      id: s.id,
      title: s.title,
      artist: s.artist,
      sharedBy: owner?.display_name ?? null,
      isOwn: s.owner_id === user.id,
      added: mine.has(s.id),
    };
  });

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-sm text-muted">Songs shared by everyone. Add one to study it.</p>
      </header>
      <LibraryList initialSongs={songs} />
    </>
  );
}
