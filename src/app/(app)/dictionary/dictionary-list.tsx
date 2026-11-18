"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { StatusBadge } from "@/components/status-badge";
import { SearchBox } from "@/components/search-box";
import { Sheet } from "@/components/sheet";
import { isWordSortKey, sortWords, WORD_SORTS, type WordSortKey } from "@/lib/dictionary-sort";
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

// The chosen sort is remembered on this device (and for this visit even if the device can't store it).
const SORT_KEY = "milim-dictionary-sort";
const SORT_EVENT = "milim-dictionary-sort-change";
let sortInMemory: WordSortKey | null = null;
function readSort(): WordSortKey {
  if (sortInMemory) return sortInMemory;
  try {
    const v = localStorage.getItem(SORT_KEY);
    if (isWordSortKey(v)) return v;
  } catch {
    // No storage: fall back to the default.
  }
  return "english";
}
function subscribeSort(cb: () => void) {
  window.addEventListener(SORT_EVENT, cb);
  return () => window.removeEventListener(SORT_EVENT, cb);
}

function rememberSort(key: WordSortKey) {
  sortInMemory = key;
  try {
    localStorage.setItem(SORT_KEY, key);
  } catch {
    // Not remembered for next time, still works now.
  }
  window.dispatchEvent(new Event(SORT_EVENT));
}

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
  const [sortOpen, setSortOpen] = useState(false);
  const sort = useSyncExternalStore(subscribeSort, readSort, () => "english" as WordSortKey);

  function chooseSort(key: WordSortKey) {
    rememberSort(key);
    setSortOpen(false);
  }

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
    return sortWords(
      words.filter((w) => {
        if (!matchesFilter(w.status, filter)) return false;
        if (!q) return true;
        return w.lemma.includes(q) || w.english.toLowerCase().includes(q) || (w.transliteration ?? "").toLowerCase().includes(q);
      }),
      sort,
    );
  }, [words, filter, query, sort]);

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

      <div className="flex gap-2">
        <SearchBox value={query} onChange={setQuery} placeholder="Search Hebrew or English" label="Search words" />
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          aria-label="Sort words"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-2"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
          </svg>
          {WORD_SORTS.find((o) => o.id === sort)?.short}
        </button>
      </div>

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

      {sortOpen && (
        <Sheet title="Sort words" onClose={() => setSortOpen(false)}>
          <div className="flex flex-col gap-1">
            {WORD_SORTS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => chooseSort(o.id)}
                aria-pressed={sort === o.id}
                className={`flex h-12 items-center justify-between rounded-xl px-4 text-left ${sort === o.id ? "bg-surface-2 font-semibold" : "hover:bg-surface-2"}`}
              >
                {o.label}
                {sort === o.id && (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Words are sorted inside whichever filter is chosen. Your choice is remembered on this device.</p>
        </Sheet>
      )}
    </div>
  );
}
