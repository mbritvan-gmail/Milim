"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CatalogSearch, Cover, PlayerLinks } from "@/components/song-links";
import { addSong } from "../[id]/actions";
import { checkExisting, createRequest, type ExistingMatch, type RequestState } from "@/app/(app)/requests/actions";

const field =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none";

export function RequestForm() {
  const [state, action, pending] = useActionState<RequestState, FormData>(createRequest, {});
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [existing, setExisting] = useState<ExistingMatch>({});
  const [dismissed, setDismissed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function check(t: string, a: string) {
    setDismissed(false);
    setAdded(false);
    setExisting(await checkExisting(t, a).catch(() => ({})));
  }

  async function addExisting(id: string) {
    setAdding(true);
    const ok = await addSong(id).catch(() => false);
    setAdding(false);
    if (ok) setAdded(true);
  }

  const showSong = existing.song && !dismissed;
  const showRequest = existing.request && !dismissed && !existing.song;

  return (
    <form action={action} className="flex flex-col gap-5">
      {coverUrl || album ? (
        <div className="flex items-center gap-3 rounded-2xl border border-accent bg-surface p-3">
          <Cover url={coverUrl} size={64} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold">{title}</span>
            <span className="truncate text-sm">{artist}</span>
            {album && <span className="truncate text-xs text-muted">{album}</span>}
          </div>
          <button
            type="button"
            onClick={() => {
              setCoverUrl(null);
              setAlbum("");
              setExisting({});
            }}
            className="shrink-0 px-1 text-sm font-semibold text-accent"
          >
            Change
          </button>
        </div>
      ) : (
        <CatalogSearch
          onPick={(m) => {
            setTitle(m.title);
            setArtist(m.artist);
            setAlbum(m.album);
            setCoverUrl(m.coverUrl);
            void check(m.title, m.artist);
          }}
        />
      )}

      {showSong && existing.song && (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border border-warn/60 bg-surface p-3">
          <p className="text-sm font-semibold text-warn">That song is already in the library</p>
          <p className="text-sm">
            <strong>{existing.song.title}</strong>
            {existing.song.artist ? ` · ${existing.song.artist}` : ""}
          </p>
          <div className="flex gap-2">
            {existing.song.inMyList || added ? (
              <Link href={`/songs/${existing.song.id}`} className="flex h-10 flex-1 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-contrast">
                {added ? "Added. Open it" : "Open the song"}
              </Link>
            ) : (
              <button type="button" disabled={adding} onClick={() => addExisting(existing.song!.id)} className="h-10 flex-1 rounded-xl bg-accent text-sm font-semibold text-accent-contrast disabled:opacity-60">
                {adding ? "Adding…" : "Add to my songs"}
              </button>
            )}
            <button type="button" onClick={() => setDismissed(true)} className="h-10 flex-1 rounded-xl border border-border text-sm font-semibold hover:bg-surface-2">
              Request anyway
            </button>
          </div>
        </div>
      )}
      {showRequest && existing.request && (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border border-warn/60 bg-surface p-3">
          <p className="text-sm font-semibold text-warn">Someone already asked for this song</p>
          <p className="text-sm">
            <strong>{existing.request.title}</strong>
            {existing.request.artist ? ` · ${existing.request.artist}` : ""}
            {existing.request.byName ? ` · requested by ${existing.request.byName}` : ""}
          </p>
          <div className="flex gap-2">
            <Link href="/requests" className="flex h-10 flex-1 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-contrast">
              See the requests
            </Link>
            <button type="button" onClick={() => setDismissed(true)} className="h-10 flex-1 rounded-xl border border-border text-sm font-semibold hover:bg-surface-2">
              Request anyway
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm text-muted">
            Song title
          </label>
          <input id="title" name="title" required maxLength={120} className={field} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => !coverUrl && title.trim().length > 1 && void check(title, artist)} />
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

      <p className="rounded-xl border border-border bg-surface p-3 text-sm leading-relaxed text-muted">
        Requests are public, so everyone can see and fill them. Whoever adds the lyrics owns the song. You can cancel your request any time before then.
      </p>

      {state.error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-surface p-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending || !title.trim()} className="h-12 rounded-xl bg-accent font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-60">
        {pending ? "Sending…" : "Request song"}
      </button>
    </form>
  );
}
