"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { makeSongPublic, removeFromList } from "./[id]/actions";
import { Sheet } from "@/components/sheet";

export type ListSong = { id: string; title: string; artist: string | null; visibility: "public" | "private"; isOwner: boolean };

type Confirm = { kind: "remove" | "public"; song: ListSong } | null;

function removeWording(song: ListSong) {
  if (song.isOwner && song.visibility === "private") return { warning: "This permanently deletes the song, its translations and its vocabulary.", button: "Delete forever" };
  if (song.isOwner)
    return {
      warning: "Public songs can't be deleted. Archiving hides it from the public library and removes it from your list, but people who already added it keep it.",
      button: "Archive",
    };
  return { warning: "This only removes it from your list. The song itself isn't deleted.", button: "Remove" };
}

export function SongsList({ songs: serverSongs, tabs }: { songs: ListSong[]; tabs: React.ReactNode }) {
  const [songs, setSongs] = useState(serverSongs);
  const [seen, setSeen] = useState(serverSongs);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // When fresh data arrives from the server, show it (without leaving edit mode).
  if (serverSongs !== seen) {
    setSeen(serverSongs);
    setSongs(serverSongs);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  async function run() {
    if (!confirm) return;
    setBusy(true);
    setProblem("");
    const { kind, song } = confirm;
    if (kind === "remove") {
      const error = await removeFromList(song.id).catch(() => "Couldn't remove that song. Please try again.");
      if (error) setProblem(error);
      else {
        setSongs((s) => s.filter((x) => x.id !== song.id));
        setConfirm(null);
      }
    } else {
      const ok = await makeSongPublic(song.id).catch(() => false);
      if (!ok) setProblem("Couldn't make this song public. Please try again.");
      else {
        setSongs((s) => s.map((x) => (x.id === song.id ? { ...x, visibility: "public" } : x)));
        setConfirm(null);
      }
    }
    setBusy(false);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Songs</h1>
        {editing ? (
          <button type="button" onClick={() => setEditing(false)} className="h-11 rounded-full bg-accent px-5 text-sm font-semibold text-accent-contrast hover:bg-accent-strong">
            Done
          </button>
        ) : (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Song options"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-2"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-12 z-20 flex w-48 flex-col rounded-2xl border border-border bg-surface-2 p-1.5 shadow-xl">
                <Link role="menuitem" href="/songs/new" className="flex h-11 items-center gap-3 rounded-xl px-3 font-semibold hover:bg-surface">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add song
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                  className="flex h-11 items-center gap-3 rounded-xl px-3 text-left font-semibold hover:bg-surface"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                    <path d="M13.5 6.5l4 4" />
                  </svg>
                  Edit
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {tabs}

      {editing && (
        <p className="px-0.5 text-sm text-muted">
          Tap the minus to remove a song. Private songs can be made public, but a public song stays public.
        </p>
      )}

      {songs.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">No songs yet. Use the menu to add your first song.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {songs.map((song) => {
            const meta = [song.artist, song.visibility === "public" ? "Public" : "Private"].filter(Boolean).join(" · ");
            if (!editing) {
              return (
                <li key={song.id}>
                  <Link href={`/songs/${song.id}`} className="flex flex-col rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-2">
                    <span className="font-medium">{song.title}</span>
                    <span className="text-sm text-muted">{meta}</span>
                  </Link>
                </li>
              );
            }
            return (
              <li key={song.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setProblem("");
                    setConfirm({ kind: "remove", song });
                  }}
                  aria-label={`Remove ${song.title}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger text-background"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 12h14" />
                  </svg>
                </button>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{song.title}</span>
                  <span className="truncate text-sm text-muted">{meta}</span>
                </span>
                {song.isOwner && song.visibility === "private" && (
                  <button
                    type="button"
                    onClick={() => {
                      setProblem("");
                      setConfirm({ kind: "public", song });
                    }}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
                  >
                    Make public
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {confirm && (
        <Sheet title={confirm.kind === "remove" ? "Remove this song?" : "Make this song public?"} onClose={() => !busy && setConfirm(null)}>
          {confirm.kind === "remove" ? (
            <p className="text-sm">
              <strong>{confirm.song.title}</strong>. {removeWording(confirm.song).warning}
            </p>
          ) : (
            <p className="text-sm">
              Everyone using milim will be able to find <strong>{confirm.song.title}</strong> and add it. <strong>This can&apos;t be undone.</strong>
            </p>
          )}
          {problem && <p className="text-sm text-danger">{problem}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => setConfirm(null)} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={run}
              className={`h-11 flex-1 rounded-xl font-semibold disabled:opacity-60 ${confirm.kind === "remove" ? "bg-danger text-accent-contrast" : "bg-accent text-accent-contrast hover:bg-accent-strong"}`}
            >
              {busy ? "Working…" : confirm.kind === "remove" ? removeWording(confirm.song).button : "Make public"}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
