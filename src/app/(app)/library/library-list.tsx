"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addSong } from "../songs/[id]/actions";

export type LibrarySong = {
  id: string;
  title: string;
  artist: string | null;
  sharedBy: string | null;
  isOwn: boolean;
  added: boolean;
};

export function LibraryList({ initialSongs }: { initialSongs: LibrarySong[] }) {
  const [songs, setSongs] = useState(initialSongs);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((s) => `${s.title} ${s.artist ?? ""} ${s.sharedBy ?? ""}`.toLowerCase().includes(q));
  }, [songs, query]);

  async function add(id: string) {
    setProblem("");
    setBusyId(id);
    const ok = await addSong(id).catch(() => false);
    setBusyId(null);
    if (ok) setSongs((all) => all.map((s) => (s.id === id ? { ...s, added: true } : s)));
    else setProblem("Couldn't add that song. Please try again.");
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, artist or who shared it"
        aria-label="Search the library"
        className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-base placeholder:text-muted focus:border-accent focus:outline-none"
      />
      {problem && <p className="rounded-xl border border-danger/40 bg-surface p-3 text-sm text-danger">{problem}</p>}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">
          {songs.length === 0
            ? "No shared songs yet. Share one of yours from its song page, and it will show up here for everyone."
            : "No songs match."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((song) => (
            <li key={song.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
              <Link href={`/songs/${song.id}`} className="min-w-0 flex-1">
                <span className="block truncate font-medium">{song.title}</span>
                <span className="block truncate text-sm text-muted">
                  {[song.artist, song.isOwn ? "Shared by you" : song.sharedBy ? `Shared by ${song.sharedBy}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </Link>
              {song.added ? (
                <span className="shrink-0 rounded-full border border-success/60 px-3 py-1 text-xs text-success">
                  {song.isOwn ? "Yours" : "Added"}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => add(song.id)}
                  disabled={busyId === song.id}
                  className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast hover:bg-accent-strong disabled:opacity-60"
                >
                  {busyId === song.id ? "Adding…" : "Add"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
