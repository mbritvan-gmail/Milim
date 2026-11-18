"use client";

import { useActionState, useState } from "react";
import { createSong, type CreateSongState } from "./actions";
import { CatalogSearch, Cover, PlayerLinks } from "@/components/song-links";

const field =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none";

// A song request being filled in: its details come from the request, and the song is added as public.
export type FilledRequest = {
  id: string;
  requesterName: string | null;
  title: string;
  artist: string;
  album: string;
  coverUrl: string | null;
  spotifyUrl: string;
  youtubeUrl: string;
};

export function NewSongForm({ request = null }: { request?: FilledRequest | null }) {
  const [state, action, pending] = useActionState<CreateSongState, FormData>(createSong, {});
  const [title, setTitle] = useState(request?.title ?? "");
  const [artist, setArtist] = useState(request?.artist ?? "");
  const [album, setAlbum] = useState(request?.album ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(request?.coverUrl ?? null);
  const [spotifyUrl, setSpotifyUrl] = useState(request?.spotifyUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(request?.youtubeUrl ?? "");

  return (
    <form action={action} className="flex flex-col gap-5">
      {request && (
        <>
          <input type="hidden" name="request_id" value={request.id} />
          <p className="rounded-xl border border-accent bg-accent/10 p-3 text-sm leading-relaxed">
            <strong>Filling a request from {request.requesterName ?? "someone"}.</strong> The song will be public and yours, and {request.requesterName ?? "they"} get it in their list.
          </p>
        </>
      )}
      {coverUrl || album ? (
        <div className="flex items-center gap-3 rounded-2xl border border-accent bg-surface p-3">
          <Cover url={coverUrl} size={64} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold">{title}</span>
            <span className="truncate text-sm">{artist}</span>
            {album && <span className="truncate text-xs text-muted">{album}</span>}
          </div>
          {!request && (
            <button
              type="button"
              onClick={() => {
                setCoverUrl(null);
                setAlbum("");
              }}
              className="shrink-0 px-1 text-sm font-semibold text-accent"
            >
              Change
            </button>
          )}
        </div>
      ) : request ? null : (
        <CatalogSearch
          onPick={(m) => {
            setTitle(m.title);
            setArtist(m.artist);
            setAlbum(m.album);
            setCoverUrl(m.coverUrl);
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <input type="hidden" name="album" value={album} />
      <input type="hidden" name="cover_url" value={coverUrl ?? ""} />
      <input type="hidden" name="spotify_url" value={spotifyUrl} />
      <input type="hidden" name="youtube_url" value={youtubeUrl} />

      <PlayerLinks
        title={title}
        artist={artist}
        spotifyUrl={spotifyUrl}
        youtubeUrl={youtubeUrl}
        onChange={(l) => {
          setSpotifyUrl(l.spotifyUrl);
          setYoutubeUrl(l.youtubeUrl);
        }}
      />

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

      {request ? (
        <p className="rounded-xl border border-border bg-surface p-3 text-sm text-muted">
          Requested songs are always public: <input type="hidden" name="visibility" value="public" />
          <strong className="text-foreground">everyone can find and add this song.</strong>
        </p>
      ) : (
      <fieldset className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm text-muted">Who can see this song?</legend>
        <label className="flex items-start gap-3">
          <input type="radio" name="visibility" value="public" defaultChecked className="mt-1 accent-[var(--accent)]" />
          <span>
            <span className="font-medium">Public</span>
            <span className="block text-sm text-muted">
              Added to the shared library for everyone. <strong className="text-foreground">A public song stays public.</strong>
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="radio" name="visibility" value="private" className="mt-1 accent-[var(--accent)]" />
          <span>
            <span className="font-medium">Private</span>
            <span className="block text-sm text-muted">Only you. You can make it public later, but not the other way around.</span>
          </span>
        </label>
      </fieldset>
      )}

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
        {pending ? "Translating… this can take up to a minute" : request ? "Translate and add for this request" : "Translate and save"}
      </button>
    </form>
  );
}
