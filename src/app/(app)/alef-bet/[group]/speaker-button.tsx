"use client";

import { useRef } from "react";
import { clipSrc } from "@/lib/alef-bet/audio-clips";

// Only one clip plays at a time, so tapping another stops the first.
let playing: HTMLAudioElement | null = null;

// A round speaker button that plays one recorded clip when tapped. Never plays by itself. If there is no
// clip for this id, nothing is shown.
export function SpeakerButton({ clipId, label }: { clipId: string; label: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const src = clipSrc(clipId);
  if (!src) return null;

  function play() {
    if (playing && playing !== audio.current) playing.pause();
    if (!audio.current) audio.current = new Audio(src!);
    audio.current.currentTime = 0;
    playing = audio.current;
    audio.current.play().catch(() => {});
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-accent hover:bg-surface-2"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      </svg>
    </button>
  );
}
