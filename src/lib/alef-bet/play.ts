"use client";

// Plays Alef-bet clips. Only one thing plays at a time: starting something new stops what was playing. Several
// clips play one after the other (a nikud tap on bet plays "ba" then "va"). Nothing ever plays by itself.
let current: HTMLAudioElement | null = null;
let run = 0;

export function playClips(sources: string[]) {
  current?.pause();
  const mine = ++run;
  const next = (i: number) => {
    if (mine !== run || i >= sources.length) return;
    const el = new Audio(sources[i]);
    current = el;
    el.addEventListener("ended", () => next(i + 1), { once: true });
    el.play().catch(() => {});
  };
  next(0);
}
