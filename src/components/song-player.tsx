"use client";

import { useState } from "react";
import { pickPlayer, type Media } from "@/lib/media";

const NAME = { spotify: "Spotify", youtube: "YouTube" } as const;

// The song's player. It opens with the person's preferred player (or whichever the song has); when the song
// has both, a small switch flips between them.
export function SongPlayer({ spotify, youtube, preferred }: { spotify: Media | null; youtube: Media | null; preferred: "spotify" | "youtube" }) {
  const { primary, other } = pickPlayer(spotify, youtube, preferred);
  const [showOther, setShowOther] = useState(false);
  const media = showOther && other ? other : primary;
  if (!media) return null;

  return (
    <>
      {other && primary && (
        <div role="group" aria-label="Player" className="flex gap-0.5 self-start rounded-xl border border-[var(--sp-line)] bg-[var(--sp-card)] p-[3px]">
          {[primary, other].map((m) => (
            <button
              key={m.type}
              type="button"
              aria-pressed={m.type === media.type}
              onClick={() => setShowOther(m.type === other.type)}
              className={`h-[34px] rounded-[9px] px-4 text-sm font-semibold transition-colors ${m.type === media.type ? "bg-[var(--sp-accent)] text-[var(--sp-on-accent)]" : "text-[var(--sp-muted)] hover:text-[var(--sp-ink)]"}`}
            >
              {NAME[m.type]}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl">
      <iframe
        key={media.url}
        title={`${NAME[media.type]} player`}
        src={media.embedUrl}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        className={`block w-full border-0 ${media.type === "spotify" ? "h-[152px]" : "aspect-video"}`}
      />
      </div>
    </>
  );
}
