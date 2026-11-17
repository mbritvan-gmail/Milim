"use client";

import Link from "next/link";
import { useState } from "react";
import { reviewCard } from "./actions";

export type Flashcard = {
  vocabId: string;
  lemma: string;
  transliteration: string | null;
  english: string;
  partOfSpeech: string | null;
  /** Leitner box 1-5, or null for a word you haven't practiced yet. */
  box: number | null;
  /** A lyric line the word appears in. */
  context: { hebrew: string; transliteration: string | null } | null;
};

type QueueItem = { card: Flashcard; repeat: boolean };

export function FlashcardRunner({ cards, showTranslit }: { cards: Flashcard[]; showTranslit: boolean }) {
  const [queue, setQueue] = useState<QueueItem[]>(() => cards.map((card) => ({ card, repeat: false })));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gotIt, setGotIt] = useState(0);
  const [again, setAgain] = useState(0);
  const [saveProblem, setSaveProblem] = useState(false);

  const done = index >= queue.length;

  function rate(correct: boolean) {
    const item = queue[index];
    if (!item.repeat) {
      // Only the first time a card is shown counts toward progress; the repeat is extra practice.
      if (correct) setGotIt((n) => n + 1);
      else setAgain((n) => n + 1);
      reviewCard(item.card.vocabId, correct)
        .then((ok) => {
          if (!ok) setSaveProblem(true);
        })
        .catch(() => setSaveProblem(true));
      if (!correct) setQueue((q) => [...q, { card: item.card, repeat: true }]);
    }
    setIndex(index + 1);
    setFlipped(false);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted">Session complete</p>
          <p className="mt-1 text-3xl font-bold text-accent">{cards.length} cards</p>
          <p className="mt-2 text-muted">
            {gotIt} got it · {again} to review again
          </p>
        </div>
        {saveProblem && (
          <p className="rounded-xl border border-danger/40 bg-surface p-3 text-sm text-danger">
            Some answers couldn&apos;t be saved, so they may show up again next time.
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-12 flex-1 rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong"
          >
            Study more
          </button>
          <Link
            href="/dictionary"
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-border hover:bg-surface-2"
          >
            Dictionary
          </Link>
        </div>
      </div>
    );
  }

  const { card, repeat } = queue[index];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Card {Math.min(index + 1, queue.length)} of {queue.length}
          {repeat && " · second look"}
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border">
          <div className="h-full bg-accent transition-all" style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show the Hebrew side" : "Reveal the meaning"}
        className="flex min-h-72 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center transition-colors hover:bg-surface-2"
      >
        {!flipped ? (
          <>
            <span lang="he" className="hebrew text-6xl font-bold text-accent">
              {card.lemma}
            </span>
            {showTranslit && card.transliteration && <span className="text-lg italic text-muted">{card.transliteration}</span>}
            <span className="mt-4 text-xs text-muted">Tap to reveal the meaning</span>
          </>
        ) : (
          <>
            <span className="text-3xl font-semibold text-foreground">{card.english}</span>
            <span lang="he" className="hebrew text-2xl text-accent">
              {card.lemma}
            </span>
            {card.partOfSpeech && <span className="text-sm text-muted">{card.partOfSpeech}</span>}
            {card.context && (
              <span className="mt-3 w-full rounded-xl bg-surface-2 p-3">
                <span className="mb-1 block text-xs uppercase tracking-wide text-muted">From a song</span>
                <span lang="he" className="hebrew block text-lg">
                  {card.context.hebrew}
                </span>
                {showTranslit && card.context.transliteration && (
                  <span className="mt-1 block text-sm italic text-muted">{card.context.transliteration}</span>
                )}
              </span>
            )}
            <span className="text-xs text-muted">{card.box ? `Level ${card.box} of 5` : "New word"}</span>
          </>
        )}
      </button>

      {flipped ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => rate(false)}
            className="h-12 flex-1 rounded-xl border border-danger/60 font-semibold text-danger hover:bg-danger/10"
          >
            Still learning
          </button>
          <button
            type="button"
            onClick={() => rate(true)}
            className="h-12 flex-1 rounded-xl bg-success font-semibold text-accent-contrast hover:opacity-90"
          >
            Got it
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="h-12 rounded-xl border border-border font-semibold hover:bg-surface-2"
        >
          Show answer
        </button>
      )}
    </div>
  );
}
