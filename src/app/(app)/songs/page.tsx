import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SongsTabs } from "@/components/songs-tabs";
import { SongsList, type ListSong } from "./songs-list";
import type { SongGroup } from "./group-actions";

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

  // Groups, order and cover art come from newer columns; if a database script hasn't been run yet, fall back
  // to a simpler list instead of failing.
  type Row = { added_at: string; group_id?: string | null; position?: number; songs: unknown };
  let rows: Row[] = [];
  let groups: SongGroup[] = [];
  const attempts = [
    { select: "added_at, group_id, position, songs(id, title, artist, visibility, owner_id, cover_url)", groupsToo: true },
    { select: "added_at, group_id, position, songs(id, title, artist, visibility, owner_id)", groupsToo: true },
    { select: "added_at, songs(id, title, artist, visibility, owner_id, cover_url)", groupsToo: false },
    { select: "added_at, songs(id, title, artist, visibility, owner_id)", groupsToo: false },
  ];
  for (const a of attempts) {
    const res = await supabase.from("user_songs").select(a.select).order("added_at", { ascending: false });
    if (res.error) continue;
    rows = (res.data ?? []) as unknown as Row[];
    if (a.groupsToo) {
      const g = await supabase.from("song_groups").select("id, name, position").order("position");
      groups = (g.data ?? []) as SongGroup[];
    }
    break;
  }

  const songs: ListSong[] = rows.flatMap((row) => {
    const song = (Array.isArray(row.songs) ? row.songs[0] : row.songs) as
      | { id: string; title: string; artist: string | null; visibility: string; owner_id: string; cover_url?: string | null }
      | undefined;
    if (!song) return [];
    return [
      {
        id: song.id,
        title: song.title,
        artist: song.artist,
        visibility: song.visibility === "public" ? ("public" as const) : ("private" as const),
        isOwner: song.owner_id === user.id,
        coverUrl: song.cover_url ?? null,
        groupId: row.group_id ?? null,
        position: row.position ?? 0,
        addedAt: row.added_at,
      },
    ];
  });

  return (
    <SongsList songs={songs} groups={groups} tabs={<SongsTabs active="mine" />} />
  );
}
