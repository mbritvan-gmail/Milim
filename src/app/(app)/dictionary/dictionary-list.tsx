"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { matchesFilter, type StudyFilter, type WordStatus } from "@/lib/study";
import { markWordKnown, resetWord } from "./actions";

export type DictionaryWord = {
  vocabId: string;
  lemma: string;
  transliteration: string | null;
  english: string;
  partOfSpeech: string | null;
  /** Part of speech and where the word comes from, e.g. "verb · from Hava Nagila". */
  note: string;
  vocalized: string | null;
  status: WordStatus;
  count: number;
};

const CHIPS: { id: StudyFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "learning", label: "Learning" },
  { id: "learned", label: "Learned" },
];

export function DictionaryList({
  initialWords,
  showTranslit,
  showNikud,
  learnAfter,
}: {
  initialWords: DictionaryWord[];
  showTranslit: boolean;
  showNikud: boolean;
  learnAfter: number;
}) {
  const [words, setWords] = useState(initialWords);
  const [filter, setFilter] = useState<StudyFilter>("all");
  const [query, setQuery] = useState("");
  const [problem, setProblem] = useState("");

  const counts = useMemo(
    () => ({
      all: words.length,
      new: words.filter((w) => w.status === "new").length,
      learning: words.filter((w) => w.status === "learning").length,
      learned: words.filter((w) => w.status === "learned").length,
    }),
    [words],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((w) => {
      if (!matchesFilter(w.status, filter)) return false;
      if (!q) return true;
      return w.lemma.includes(q) || w.english.toLowerCase().includes(q) || (w.transliteration ?? "").toLowerCase().includes(q);
    });
  }, [words, filter, query]);

  function change(vocabId: string, next: Pick<DictionaryWord, "status" | "count">, save: Promise<boolean>) {
    setProblem("");
    const before = words;
    setWords((ws) => ws.map((w) => (w.vocabId === vocabId ? { ...w, ...next } : w)));
    save
      .then((ok) => {
        if (!ok) {
          setWords(before);
          setProblem("Couldn't save that. Please try again.");
        }
      })
      .catch(() => {
        setWords(before);
        setProblem("Couldn't save that. Please try again.");
      });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            aria-pressed={filter === c.id}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${filter === c.id ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:bg-surface-2"}`}
          >
            {c.label} <span className="opacity-70">{counts[c.id]}</span>
          </button>
        ))}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Hebrew or English"
        aria-label="Search words"
        className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-base placeholder:text-muted focus:border-accent focus:outline-none"
      />

      {problem && <p className="rounded-xl border border-danger/40 bg-surface p-3 text-sm text-danger">{problem}</p>}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">
          {words.length === 0 ? "No words yet. Add a song to fill your dictionary." : "No words match."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((w) => (
            <li key={w.vocabId} className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3">
              {/* English on the left, Hebrew on the right. Tapping opens the word's card. */}
              <Link href={`/dictionary/${w.vocabId}`} className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-left">
                  <span className="block">{w.english}</span>
                  {w.note && <span className="block text-xs text-muted">{w.note}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span lang="he" className="hebrew block text-xl text-accent">
                    {showNikud && w.vocalized ? w.vocalized : w.lemma}
                  </span>
                  {showTranslit && w.transliteration && <span className="block text-sm italic text-muted">{w.transliteration}</span>}
                </span>
              </Link>
              <div className="flex min-h-6 items-center justify-between">
                <StatusBadge status={w.status} count={w.count} learnAfter={learnAfter} />
                {w.status === "learned" ? (
                  <button
                    type="button"
                    onClick={() => change(w.vocabId, { status: "learning", count: 0 }, resetWord(w.vocabId))}
                    className="text-xs text-muted underline underline-offset-2 hover:text-foreground"
                  >
                    Reset
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => change(w.vocabId, { status: "learned", count: Math.max(w.count, learnAfter) }, markWordKnown(w.vocabId))}
                    className="text-xs text-muted underline underline-offset-2 hover:text-foreground"
                  >
                    I know this
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
