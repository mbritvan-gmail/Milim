"use client";

import { useRef, useState, useTransition } from "react";
import { findOnSpotify, findOnYouTube, findSongCatalog } from "@/app/(app)/songs/new/actions";
import { SearchBox } from "@/components/search-box";
import type { SongMatch } from "@/lib/deezer";
import { parseMedia } from "@/lib/media";

// Cover art is shown straight from the catalog's image servers (we only keep the address).
function Cover({ url, size }: { url: string | null; size: number }) {
  const style = { width: size, height: size };
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" style={style} className="shrink-0 rounded-lg object-cover" />
  ) : (
    <span style={style} className="flex shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
      <svg viewBox="0 0 24 24" width={size * 0.45} height={size * 0.45} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V5l11-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </svg>
    </span>
  );
}
export { Cover };

// "Find the song": type a title (Hebrew or English), pick a match, and the artist, album and cover art
// are filled in. Searches as you type, after a short pause.
export function CatalogSearch({ onPick, search = findSongCatalog }: { onPick: (m: SongMatch) => void; /** The lookup (replaced in tests). */ search?: typeof findSongCatalog }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SongMatch[]>([]);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);

  function change(value: string) {
    setQuery(value);
    setError("");
    if (timer.current) clearTimeout(timer.current);
    const id = ++latest.current;
    if (value.trim().length < 2) {
      setMatches([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const r = await search(value).catch(() => ({ error: "The song search isn't reachable right now. You can enter the title and artist yourself." }));
      if (id !== latest.current) return;
      setSearching(false);
      if ("error" in r && r.error) {
        setMatches([]);
        setError(r.error);
      } else setMatches(("matches" in r && r.matches) || []);
    }, 450);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted">Find the song</span>
      <div className="flex">
        <SearchBox value={query} onChange={change} placeholder="Type the song title" label="Find the song" />
      </div>
      {searching && <p className="text-xs text-muted">Searching…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {!searching && !error && query.trim().length >= 2 && matches.length === 0 && (
        <p className="text-sm text-muted">No matches. You can enter the title and artist yourself below.</p>
      )}
      {matches.length > 0 && (
        <ul className="flex flex-col gap-2">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(m);
                  setMatches([]);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-2 text-left hover:bg-surface-2"
              >
                <Cover url={m.coverUrl} size={52} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{m.title}</span>
                  <span className="truncate text-sm">{m.artist}</span>
                  {m.album && <span className="truncate text-xs text-muted">{m.album}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-right text-xs text-muted">Search by Deezer</p>
    </div>
  );
}

type PlayerMatch = { url: string; name: string; artists: string; image: string | null };

// The song's Spotify and YouTube links: search each (using the title and artist), or paste a link.
export function PlayerLinks({
  title,
  artist,
  spotifyUrl,
  youtubeUrl,
  onChange,
  finders = { spotify: findOnSpotify, youtube: findOnYouTube },
}: {
  /** The two searches (replaced in tests). */
  finders?: { spotify: typeof findOnSpotify; youtube: typeof findOnYouTube };
  title: string;
  artist: string;
  spotifyUrl: string;
  youtubeUrl: string;
  onChange: (links: { spotifyUrl: string; youtubeUrl: string }) => void;
}) {
  const [kind, setKind] = useState<"spotify" | "youtube">("spotify");
  const [matches, setMatches] = useState<PlayerMatch[]>([]);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");
  const [searching, start] = useTransition();

  function search(next: "spotify" | "youtube") {
    setError("");
    setMatches([]);
    setKind(next);
    if (!title.trim()) {
      setError("Fill in the song title first, then tap Find.");
      return;
    }
    start(async () => {
      try {
        const r = next === "spotify" ? await finders.spotify(title, artist) : await finders.youtube(title, artist);
        if (r.error) setError(r.error);
        else setMatches(r.matches ?? []);
      } catch {
        setError("Couldn't reach the server. Please try again.");
      }
    });
  }

  function applyLink(url: string, type: "spotify" | "youtube") {
    onChange({ spotifyUrl: type === "spotify" ? url : spotifyUrl, youtubeUrl: type === "youtube" ? url : youtubeUrl });
    setMatches([]);
  }

  function pasted(value: string) {
    setPaste(value);
    setError("");
    const media = parseMedia(value);
    if (media) {
      applyLink(media.url, media.type);
      setPaste("");
    } else if (value.trim().length > 12) setError("That doesn't look like a Spotify or YouTube link.");
  }

  const rows = [
    { type: "spotify" as const, name: "Spotify", url: spotifyUrl },
    { type: "youtube" as const, name: "YouTube", url: youtubeUrl },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted">
        Player links <span className="text-muted/70">(optional)</span>
      </span>
      <div className="flex gap-2">
        {(["spotify", "youtube"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => search(k)}
            disabled={searching}
            className="h-11 flex-1 rounded-xl border border-border bg-surface text-sm font-semibold hover:bg-surface-2 disabled:opacity-60"
          >
            {searching && kind === k ? "Searching…" : k === "spotify" ? "Find on Spotify" : "Find on YouTube"}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">Searches use the title and artist. Tap a result to use it, then search the other: a song can have both.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      {matches.length > 0 && (
        <ul className="flex flex-col gap-2">
          {matches.map((m) => (
            <li key={m.url}>
              <button type="button" onClick={() => applyLink(m.url, kind)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-2 text-left hover:bg-surface-2">
                <Cover url={m.image} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block truncate text-sm text-muted">{m.artists}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        value={paste}
        onChange={(e) => pasted(e.target.value)}
        inputMode="url"
        placeholder="Or paste a Spotify or YouTube link"
        aria-label="Paste a Spotify or YouTube link"
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted focus:border-accent"
      />
      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5">
        <span className="text-xs font-medium text-muted">Links on this song</span>
        {rows.map((r) => (
          <div key={r.type} className="flex min-h-8 items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-semibold">{r.name}</span>
            <span className={`min-w-0 flex-1 truncate text-xs ${r.url ? "text-foreground" : "text-muted"}`}>{r.url ? r.url.replace(/^https?:\/\/(www\.)?/, "") : "Not added yet"}</span>
            {r.url && (
              <button
                type="button"
                aria-label={`Remove the ${r.name} link`}
                onClick={() => onChange({ spotifyUrl: r.type === "spotify" ? "" : spotifyUrl, youtubeUrl: r.type === "youtube" ? "" : youtubeUrl })}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-base leading-none text-muted hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
