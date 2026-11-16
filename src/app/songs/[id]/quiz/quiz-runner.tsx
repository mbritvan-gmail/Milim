"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { sameAnswer } from "@/lib/quiz";
import { submitQuiz, type QuizAnswer, type QuizResult } from "./actions";

export type QuizQuestion = {
  vocabId: string;
  lemma: string;
  transliteration: string | null;
  /** The correct English meaning. */
  answer: string;
  options: string[];
  clue: { hebrew: string; transliteration: string | null } | null;
};

export function QuizRunner({
  songId,
  questions,
  showTranslit,
}: {
  songId: string;
  questions: QuizQuestion[];
  showTranslit: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [clueOpen, setClueOpen] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();

  // Marked in the browser, used only if the server can't save, so you still see your score.
  function localResult(all: QuizAnswer[]): QuizResult {
    const results = all.map((a) => {
      const q = questions.find((x) => x.vocabId === a.vocabId)!;
      return {
        vocabId: a.vocabId,
        lemma: q.lemma,
        chosen: a.chosen,
        correctAnswer: q.answer,
        correct: sameAnswer(a.chosen, q.answer),
      };
    });
    return { score: results.filter((r) => r.correct).length, total: results.length, results };
  }

  function save(all: QuizAnswer[]) {
    setError("");
    startSaving(async () => {
      try {
        const res = await submitQuiz(songId, all);
        if ("error" in res) {
          setError(res.error);
          setResult(localResult(all));
        } else {
          setResult(res);
        }
      } catch {
        setError("Couldn't reach the server.");
        setResult(localResult(all));
      }
    });
  }

  if (saving) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-muted">Saving your results…</p>
      </div>
    );
  }

  if (result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="flex flex-col gap-6">
        {error && (
          <div className="flex flex-col gap-2 rounded-xl border border-danger/40 bg-surface p-4 text-sm">
            <p className="text-danger">Your score wasn&apos;t saved: {error}</p>
            <button
              type="button"
              onClick={() => save(answers)}
              className="self-start rounded-full border border-border px-4 py-2 hover:bg-surface-2"
            >
              Try saving again
            </button>
          </div>
        )}
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted">Your score</p>
          <p className="mt-1 text-5xl font-bold text-accent">
            {result.score}/{result.total}
          </p>
          <p className="mt-2 text-muted">{pct >= 80 ? "Great job!" : pct >= 50 ? "Nice work, keep practicing." : "Good start. Try again to improve."}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {result.results.map((r) => (
            <li
              key={r.vocabId}
              className={`flex items-baseline justify-between gap-4 rounded-xl border px-4 py-3 ${r.correct ? "border-success/40" : "border-danger/40"} bg-surface`}
            >
              <span lang="he" className="hebrew text-xl">
                {r.lemma}
              </span>
              <span className="text-right text-sm">
                <span className="block">{r.correctAnswer}</span>
                {!r.correct && <span className="block text-danger">You chose: {r.chosen || "(none)"}</span>}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-12 flex-1 rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong"
          >
            Retake quiz
          </button>
          <Link
            href={`/songs/${songId}`}
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-border hover:bg-surface-2"
          >
            Back to song
          </Link>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const answered = selected !== null;
  const isLast = index === questions.length - 1;

  function choose(option: string) {
    if (answered) return;
    setSelected(option);
  }

  function next() {
    const updated = [...answers, { vocabId: q.vocabId, chosen: selected ?? "" }];
    setAnswers(updated);
    if (isLast) {
      save(updated);
    } else {
      setIndex(index + 1);
      setSelected(null);
      setClueOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border">
          <div className="h-full bg-accent transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-xs uppercase tracking-wide text-muted">What does this mean?</p>
        <p lang="he" className="hebrew mt-2 text-center text-5xl font-bold">
          {q.lemma}
        </p>
        {showTranslit && q.transliteration && <p className="mt-1 text-sm italic text-muted">{q.transliteration}</p>}
      </div>

      {q.clue && (
        <div>
          {clueOpen ? (
            <div className="rounded-xl border border-border bg-surface-2 p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted">Clue: from the song</p>
              <p lang="he" className="hebrew text-lg">
                {q.clue.hebrew}
              </p>
              {showTranslit && q.clue.transliteration && (
                <p className="mt-1 text-sm italic text-muted">{q.clue.transliteration}</p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setClueOpen(true)}
              className="rounded-full border border-border px-4 py-2 text-sm hover:bg-surface-2"
            >
              💡 Clue
            </button>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {q.options.map((option) => {
          const isCorrect = option === q.answer;
          const isChosen = option === selected;
          let style = "border-border bg-surface hover:bg-surface-2";
          if (answered && isCorrect) style = "border-success bg-success/15";
          else if (answered && isChosen) style = "border-danger bg-danger/15";
          else if (answered) style = "border-border bg-surface opacity-60";
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => choose(option)}
                disabled={answered}
                className={`w-full rounded-xl border px-4 py-3 text-left text-base transition-colors ${style}`}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <button
          type="button"
          onClick={next}
          className="h-12 rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong"
        >
          {isLast ? "Finish" : "Next"}
        </button>
      )}
    </div>
  );
}
