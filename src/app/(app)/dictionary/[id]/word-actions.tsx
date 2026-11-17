"use client";

import Link from "next/link";
import { useState } from "react";
import { markWordKnown, resetWord } from "../actions";
import { StatusBadge } from "@/components/status-badge";
import type { WordStatus } from "@/lib/study";

// Buttons on a word's card: mark it known, reset it, or practice just this word.
export function WordActions({
  vocabId,
  initialStatus,
  initialCount,
  learnAfter,
}: {
  vocabId: string;
  initialStatus: WordStatus;
  initialCount: number;
  learnAfter: number;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function run(action: () => Promise<boolean>, next: { status: WordStatus; count: number }) {
    setBusy(true);
    setProblem("");
    const ok = await action().catch(() => false);
    setBusy(false);
    if (ok) {
      setStatus(next.status);
      setCount(next.count);
    } else {
      setProblem("Couldn't save that. Please try again.");
    }
  }

  const left = status === "learning" ? learnAfter - Math.min(count, learnAfter - 1) : 0;

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center justify-center gap-2 text-sm text-muted">
        <StatusBadge status={status} count={count} learnAfter={learnAfter} />
        {status === "new" ? "Not practiced yet" : status === "learned" ? "You know this one" : `${left} more correct to learn it`}
      </p>
      {status === "learned" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => resetWord(vocabId), { status: "learning", count: 0 })}
          className="h-11 rounded-xl border border-border font-medium hover:bg-surface disabled:opacity-60"
        >
          Reset to Learning
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => markWordKnown(vocabId), { status: "learned", count: Math.max(count, learnAfter) })}
          className="h-11 rounded-xl border border-border font-medium hover:bg-surface disabled:opacity-60"
        >
          I know this
        </button>
      )}
      <Link
        href={`/flashcards?word=${vocabId}`}
        className="flex h-12 items-center justify-center rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong"
      >
        Practice this word
      </Link>
      {problem && <p className="text-center text-sm text-danger">{problem}</p>}
    </div>
  );
}
