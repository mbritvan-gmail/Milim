"use client";

import { useState, useTransition } from "react";
import { setTransliteration } from "./actions";

export type SongLine = { id: string; hebrew: string; transliteration: string | null; english: string | null };
export type SongWord = {
  id: string;
  lemma: string;
  surface_form: string;
  transliteration: string | null;
  english: string;
  part_of_speech: string | null;
};

export function SongView({
  lines,
  words,
  initialShowTranslit,
}: {
  lines: SongLine[];
  words: SongWord[];
  initialShowTranslit: boolean;
}) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [showTranslit, setShowTranslit] = useState(initialShowTranslit);
  const [, startTransition] = useTransition();

  const allRevealed = revealed.size === lines.length;

  function toggleLine(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTranslit() {
    const next = !showTranslit;
    setShowTranslit(next);
    startTransition(() => {
      void setTransliteration(next);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Lyrics" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setRevealed(allRevealed ? new Set() : new Set(lines.map((l) => l.id)))}
            className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
          >
            {allRevealed ? "Hide all English" : "Show all English"}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={showTranslit}
            onClick={toggleTranslit}
            className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
          >
            <span
              className={`inline-block h-4 w-7 rounded-full p-0.5 transition-colors ${showTranslit ? "bg-accent" : "bg-border"}`}
            >
              <span
                className={`block h-3 w-3 rounded-full bg-background transition-transform ${showTranslit ? "translate-x-3" : ""}`}
              />
            </span>
            Pronunciation
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {lines.map((line) => {
            const open = revealed.has(line.id);
            return (
              <li key={line.id}>
                <button
                  type="button"
                  onClick={() => toggleLine(line.id)}
                  aria-expanded={open}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-2"
                >
                  <span lang="he" className="hebrew block text-xl">
                    {line.hebrew}
                  </span>
                  {showTranslit && line.transliteration && (
                    <span className="mt-1 block text-sm italic text-muted">{line.transliteration}</span>
                  )}
                  {open ? (
                    <span className="mt-2 block text-base text-accent">{line.english || "(no translation)"}</span>
                  ) : (
                    <span className="mt-2 block text-xs text-muted">Tap to reveal English</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Key words" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Key words ({words.length})</h2>
        {words.length === 0 ? (
          <p className="text-sm text-muted">No key words were found for this song.</p>
        ) : (
          <ul className="grid gap-2">
            {words.map((w) => (
              <li key={w.id} className="flex items-baseline justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3">
                <div>
                  <span lang="he" className="hebrew text-xl">
                    {w.lemma}
                  </span>
                  {showTranslit && w.transliteration && (
                    <span className="ml-2 text-sm italic text-muted">{w.transliteration}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="block">{w.english}</span>
                  {w.part_of_speech && <span className="block text-xs text-muted">{w.part_of_speech}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
