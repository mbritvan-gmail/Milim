"use client";

import { useState, useTransition } from "react";
import { findOnSpotify, findOnYouTube } from "../new/actions";

type Match = { url: string; name: string; artists: string; image: string | null };

// "Find on Spotify / YouTube" for a song's link, the same helper the add-lyrics page has.
export function MediaFinder({ title, artist, onPick }: { title: string; artist: string; onPick: (url: string) => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [searching, start] = useTransition();
  const [kind, setKind] = useState<"spotify" | "youtube">("spotify");

  function search(next: "spotify" | "youtube") {
    setError("");
    setMatches([]);
    setKind(next);
    if (!title.trim()) {
      setError("Type the song title first.");
      return;
    }
    start(async () => {
      try {
        const result = next === "spotify" ? await findOnSpotify(title, artist) : await findOnYouTube(title, artist);
        if (result.error) setError(result.error);
        else setMatches(result.matches ?? []);
      } catch {
        setError("Couldn't reach the server. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {(["spotify", "youtube"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => search(k)}
            disabled={searching}
            className="rounded-full border border-border px-3.5 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-50"
          >
            {searching && kind === k ? "Searching…" : k === "spotify" ? "Find on Spotify" : "Find on YouTube"}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {matches.length > 0 && (
        <ul className="flex flex-col gap-2">
          {matches.map((m) => (
            <li key={m.url}>
              <button
                type="button"
                onClick={() => {
                  onPick(m.url);
                  setMatches([]);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-2 text-left hover:bg-surface-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.image ? <img src={m.image} alt="" width={44} height={44} className="h-11 w-11 rounded-md" /> : <span className="h-11 w-11 rounded-md bg-border" />}
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
  );
}
