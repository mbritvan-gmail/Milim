"use client";

import { VOICES, type Voice } from "@/lib/alef-bet/audio-clips";
import { setVoice, useVoice } from "@/lib/alef-bet/use-voice";

const LABEL: Record<Voice, string> = { female: "Female", male: "Male" };

// Female / Male voice for the sound buttons on the cards. Saved on this device.
export function VoiceSwitch() {
  const voice = useVoice();
  return (
    <div role="group" aria-label="Voice for the sounds" className="flex items-center gap-2">
      <span className="text-sm text-muted">Voice</span>
      <div className="flex rounded-full border border-border bg-surface p-0.5">
        {VOICES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVoice(v)}
            aria-pressed={voice === v}
            className={`h-8 rounded-full px-3.5 text-sm font-semibold transition-colors ${voice === v ? "bg-accent text-accent-contrast" : "text-muted hover:text-foreground"}`}
          >
            {LABEL[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
