"use client";

import { useEffect, useState } from "react";

export const TAGLINES = [
  "Learn Hebrew without the funky owl",
  "Say chhhhhhh",
  "Your favorite songs are secretly flashcards",
  "Hebrew you'll actually sing in the shower",
  "Stop pretending you know the words",
  "Because “shalom” only gets you so far",
  "Turn the radio into a classroom",
  "Every chorus is a lesson in disguise",
  "Yalla, press play",
  "Finally, a good reason to sing along",
  "Lost in translation? Not anymore",
  "Hummus is not a complete vocabulary",
];

export function RotatingTagline({ intervalMs = 4500 }: { intervalMs?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % TAGLINES.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return (
    // Fixed height so the form below doesn't jump when a line wraps.
    <div className="flex h-16 items-center justify-center" aria-live="off">
      <p key={index} className="tagline-in max-w-xs text-center text-lg font-medium text-foreground/90">
        {TAGLINES[index]}
      </p>
    </div>
  );
}
