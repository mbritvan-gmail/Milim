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
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My songs</h1>
          <p className="text-sm text-muted">Signed in as {user.email}</p>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:bg-surface hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </Link>
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

    </>
  );
}
