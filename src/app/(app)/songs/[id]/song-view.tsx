"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { isSectionLabel } from "@/lib/lyrics";
import type { WordStatus } from "@/lib/study";

export type SongLine = { id: string; hebrew: string; transliteration: string | null; english: string | null };
export type SongWord = {
  id: string;
  lemma: string;
  surface_form: string;
  transliteration: string | null;
  english: string;
  part_of_speech: string | null;
  status: WordStatus;
  count: number;
};

export function SongView({
  lines,
  words,
  showTranslit,
  learnAfter,
}: {
  lines: SongLine[];
  words: SongWord[];
  /** The person's "show pronunciation" setting (changed on the Settings page). */
  showTranslit: boolean;
  learnAfter: number;
}) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [wordsOpen, setWordsOpen] = useState(false);

  // Section labels (Verse, Chorus...) are headings, not tappable lines.
  const lyricLines = lines.filter((l) => !isSectionLabel(l.hebrew));
  const allRevealed = lyricLines.length > 0 && lyricLines.every((l) => revealed.has(l.id));

  function toggleLine(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Lyrics" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setRevealed(allRevealed ? new Set() : new Set(lyricLines.map((l) => l.id)))}
            className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
          >
            {allRevealed ? "Hide all English" : "Show all English"}
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {lines.map((line) => {
            if (isSectionLabel(line.hebrew)) {
              return (
                <li key={line.id} className="flex items-baseline gap-2 px-1 pt-4 text-sm font-medium text-accent">
                  <span lang="he" className="hebrew">
                    {line.hebrew.replace(/^\[|\]$/g, "")}
                  </span>
                  {line.english && <span className="text-muted">· {line.english}</span>}
                </li>
              );
            }
            const open = revealed.has(line.id);
            return (
              <li key={line.id}>
                <button
                  type="button"
                  onClick={() => toggleLine(line.id)}
                  aria-expanded={open}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-2"
                >
                  <span lang="he" className="hebrew block text-right text-xl">
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

      <section aria-label="Song vocabulary" className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setWordsOpen((o) => !o)}
          aria-expanded={wordsOpen}
          aria-controls="song-vocabulary-list"
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left hover:bg-surface-2"
        >
          <span className="text-lg font-semibold">Song vocabulary ({words.length})</span>
          <span aria-hidden className="text-2xl leading-none text-accent">
            {wordsOpen ? "−" : "+"}
          </span>
        </button>
        {wordsOpen && words.length > 0 && (
          <p className="px-1 text-xs text-muted">Words to learn from this song. Your Dictionary collects the words from all your songs.</p>
        )}
        {wordsOpen &&
          (words.length === 0 ? (
            <p className="text-sm text-muted">No vocabulary was found for this song.</p>
          ) : (
            <ul id="song-vocabulary-list" className="grid gap-2">
              {words.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/dictionary/${w.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 hover:bg-surface-2"
                  >
                    {/* English on the left, Hebrew on the right. */}
                    <div className="flex min-w-0 flex-col items-start gap-1.5 text-left">
                      <span className="block">
                        {w.english}
                        {w.part_of_speech && <span className="ml-2 text-xs text-muted">{w.part_of_speech}</span>}
                      </span>
                      <StatusBadge status={w.status} count={w.count} learnAfter={learnAfter} />
                    </div>
                    <div className="shrink-0 text-right">
                      <span lang="he" className="hebrew block text-xl text-accent">
                        {w.lemma}
                      </span>
                      {showTranslit && w.transliteration && (
                        <span className="block text-sm italic text-muted">{w.transliteration}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </section>
    </div>
  );
}
