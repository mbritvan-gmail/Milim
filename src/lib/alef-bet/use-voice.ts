"use client";

import { useSyncExternalStore } from "react";
import type { Voice } from "./audio-clips";

// Which voice (female or male) the sound buttons play. Kept on this device, like the theme, so it needs no
// database and no change to Settings. Female by default.
const KEY = "milim-alef-voice";
const EVENT = "milim-alef-voice-change";

function read(): Voice {
  try {
    return localStorage.getItem(KEY) === "male" ? "male" : "female";
  } catch {
    return "female";
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function setVoice(voice: Voice) {
  try {
    localStorage.setItem(KEY, voice);
  } catch {
    // Private mode and the like: the choice just won't be remembered.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useVoice(): Voice {
  return useSyncExternalStore(subscribe, read, () => "female");
}
