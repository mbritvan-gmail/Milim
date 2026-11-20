"use client";

import { clipSrc, hasClip } from "@/lib/alef-bet/audio-clips";
import { playClips } from "@/lib/alef-bet/play";
import type { SpeechVoice } from "@/lib/settings";

// A round speaker button that plays one recorded clip when tapped, in the person's Voice setting.
// Never plays by itself. If there is no clip for this id, nothing is shown.
export function SpeakerButton({ clipId, label, voice }: { clipId: string; label: string; voice: SpeechVoice }) {
  if (!hasClip(clipId)) return null;

  function play() {
    const src = clipSrc(clipId, voice) ?? clipSrc(clipId, voice === "female" ? "male" : "female");
    if (src) playClips([src]);
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
