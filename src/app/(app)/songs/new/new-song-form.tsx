"use client";

import { useActionState, useState, useTransition } from "react";
import { createSong, findOnSpotify, findOnYouTube, type CreateSongState } from "./actions";
import type { SpotifyMatch } from "@/lib/spotify";

const field =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none";

export function NewSongForm() {
  const [state, action, pending] = useActionState<CreateSongState, FormData>(createSong, {});
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [matches, setMatches] = useState<SpotifyMatch[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searching, startSearch] = useTransition();
  const [searchingKind, setSearchingKind] = useState<"spotify" | "youtube">("spotify");

  function searchMedia(kind: "spotify" | "youtube") {
    setSearchError("");
    setMatches([]);
    setSearchingKind(kind);
    startSearch(async () => {
      const result = kind === "spotify" ? await findOnSpotify(title, artist) : await findOnYouTube(title, artist);
      if (result.error) setSearchError(result.error);
      else setMatches(result.matches ?? []);
    });
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm text-muted">
          Song title
        </label>
        <input id="title" name="title" required maxLength={120} className={field} placeholder="e.g. Hatikvah" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="artist" className="text-sm text-muted">
          Artist <span className="text-muted/70">(optional)</span>
        </label>
        <input id="artist" name="artist" maxLength={120} className={field} value={artist} onChange={(e) => setArtist(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lyrics" className="text-sm text-muted">
          Hebrew lyrics
        </label>
        <textarea
          id="lyrics"
          name="lyrics"
          required
          rows={12}
          dir="rtl"
          lang="he"
          className={`${field} hebrew min-h-48 text-lg`}
          placeholder="הדבק כאן את המילים"
        />
        <p className="text-xs text-muted">One line per row. Put section names in brackets, like [Chorus] or [בית 2]. Only lines with Hebrew are used.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="media_url" className="text-sm text-muted">
          Spotify or YouTube link <span className="text-muted/70">(optional)</span>
        </label>
        <input
          id="media_url"
          name="media_url"
          type="url"
          inputMode="url"
          className={field}
          placeholder="https://"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => searchMedia("spotify")}
            disabled={searching || !title.trim()}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-50"
          >
            {searching && searchingKind === "spotify" ? "Searching…" : "Find on Spotify"}
          </button>
          <button
            type="button"
            onClick={() => searchMedia("youtube")}
            disabled={searching || !title.trim()}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-50"
          >
            {searching && searchingKind === "youtube" ? "Searching…" : "Find on YouTube"}
          </button>
        </div>
        <p className="text-xs text-muted">YouTube plays the full song in the player; Spotify may play only a preview.</p>
        {searchError && <p className="text-sm text-danger">{searchError}</p>}
        {matches.length > 0 && (
          <ul className="flex flex-col gap-2">
            {matches.map((m) => (
              <li key={m.url}>
                <button
                  type="button"
                  onClick={() => {
                    setMediaUrl(m.url);
                    setMatches([]);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-2 text-left hover:bg-surface-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.image ? <img src={m.image} alt="" width={48} height={48} className="h-12 w-12 rounded-md" /> : <span className="h-12 w-12 rounded-md bg-border" />}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{m.name}</span>
                    <span className="block truncate text-sm text-muted">{m.artists}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm text-muted">Who can see this song?</legend>
        <label className="flex items-start gap-3">
          <input type="radio" name="visibility" value="private" defaultChecked className="mt-1 accent-[var(--accent)]" />
          <span>
            <span className="font-medium">Private</span>
            <span className="block text-sm text-muted">Only you.</span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="radio" name="visibility" value="public" className="mt-1 accent-[var(--accent)]" />
          <span>
            <span className="font-medium">Public</span>
            <span className="block text-sm text-muted">
              Added to the shared library for everyone. <strong className="text-foreground">This can&apos;t be undone.</strong>
            </span>
          </span>
        </label>
      </fieldset>

      {state.error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-surface p-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-xl bg-accent font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Translating… this can take up to a minute" : "Translate and save"}
      </button>
    </form>
  );
}
