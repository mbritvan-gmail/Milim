import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My songs · milim" };

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
    .select("added_at, songs(id, title, artist, visibility)")
    .order("added_at", { ascending: false });

  const songs = (rows ?? []).flatMap((row) => {
    const song = Array.isArray(row.songs) ? row.songs[0] : row.songs;
    return song ? [song] : [];
  });

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My songs</h1>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm text-muted underline underline-offset-4">
            Sign out
          </button>
        </form>
      </header>

      <Link
        href="/songs/new"
        className="flex h-12 items-center justify-center rounded-xl bg-accent font-semibold text-accent-contrast transition-colors hover:bg-accent-strong"
      >
        + Add lyrics
      </Link>

      {songs.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">
          No songs yet. Add your first song to start learning.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {songs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/songs/${song.id}`}
                className="flex flex-col rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
              >
                <span className="font-medium">{song.title}</span>
                <span className="text-sm text-muted">
                  {[song.artist, song.visibility === "public" ? "Public" : "Private"].filter(Boolean).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-muted">Signed in as {user.email}</p>
    </>
  );
}
