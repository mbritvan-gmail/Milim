"use client";

import { useRef } from "react";
import { clipSrc, hasClip } from "@/lib/alef-bet/audio-clips";
import { useVoice } from "@/lib/alef-bet/use-voice";

// Only one clip plays at a time, so tapping another stops the first.
let playing: HTMLAudioElement | null = null;

// A round speaker button that plays one recorded clip when tapped, in the voice chosen on the Alef-bet page.
// Never plays by itself. If there is no clip for this id, nothing is shown.
export function SpeakerButton({ clipId, label }: { clipId: string; label: string }) {
  const voice = useVoice();
  const audio = useRef<{ src: string; el: HTMLAudioElement } | null>(null);
  if (!hasClip(clipId)) return null;

  function play() {
    const src = clipSrc(clipId, voice) ?? clipSrc(clipId, voice === "female" ? "male" : "female");
    if (!src) return;
    if (playing) playing.pause();
    // A new player only when the voice (so the file) has changed.
    if (!audio.current || audio.current.src !== src) audio.current = { src, el: new Audio(src) };
    const el = audio.current.el;
    el.currentTime = 0;
    playing = el;
    el.play().catch(() => {});
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
