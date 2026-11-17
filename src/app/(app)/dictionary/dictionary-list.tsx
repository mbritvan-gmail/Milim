"use client";

import { useMemo, useState, useTransition } from "react";
import { setTransliteration } from "../songs/[id]/actions";
import { markWordKnown } from "./actions";

export type DictionaryWord = {
  vocabId: string;
  lemma: string;
  transliteration: string | null;
  english: string;
  partOfSpeech: string | null;
  status: "new" | "learning" | "learned";
  box: number | null;
};

type Filter = "all" | "new" | "learning" | "learned";

const STATUS_STYLE: Record<DictionaryWord["status"], string> = {
  new: "border-border text-muted",
  learning: "border-accent/60 text-accent",
  learned: "border-success/60 text-success",
};
const STATUS_LABEL: Record<DictionaryWord["status"], string> = { new: "New", learning: "Learning", learned: "Learned" };

export function DictionaryList({
  initialWords,
  initialShowTranslit,
}: {
  initialWords: DictionaryWord[];
  initialShowTranslit: boolean;
}) {
  const [words, setWords] = useState(initialWords);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showTranslit, setShowTranslit] = useState(initialShowTranslit);
  const [problem, setProblem] = useState("");
  const [, startTransition] = useTransition();

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
      if (filter !== "all" && w.status !== filter) return false;
      if (!q) return true;
      return (
        w.lemma.includes(q) ||
        w.english.toLowerCase().includes(q) ||
        (w.transliteration ?? "").toLowerCase().includes(q)
      );
    });
  }, [words, query, filter]);

  function toggleTranslit() {
    const next = !showTranslit;
    setShowTranslit(next);
    startTransition(() => {
      void setTransliteration(next);
    });
  }

  function markKnown(vocabId: string) {
    setProblem("");
    const before = words;
    setWords((ws) => ws.map((w) => (w.vocabId === vocabId ? { ...w, status: "learned", box: Math.max(w.box ?? 0, 3) } : w)));
    markWordKnown(vocabId)
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

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "new", label: "New" },
    { id: "learning", label: "Learning" },
    { id: "learned", label: "Learned" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Hebrew or English"
          aria-label="Search words"
          className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-base placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          role="switch"
          aria-checked={showTranslit}
          aria-label="Show pronunciation"
          onClick={toggleTranslit}
          className="flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-2 text-sm hover:bg-surface-2"
        >
          <span className={`inline-block h-4 w-7 rounded-full p-0.5 transition-colors ${showTranslit ? "bg-accent" : "bg-border"}`}>
            <span className={`block h-3 w-3 rounded-full bg-background transition-transform ${showTranslit ? "translate-x-3" : ""}`} />
          </span>
          Aa
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {chips.map((c) => (
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

      {problem && <p className="rounded-xl border border-danger/40 bg-surface p-3 text-sm text-danger">{problem}</p>}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">
          {words.length === 0 ? "No words yet. Add a song to fill your dictionary." : "No words match."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((w) => (
            <li key={w.vocabId} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
              <div className="min-w-0">
                <span lang="he" className="hebrew text-xl">
                  {w.lemma}
                </span>
                {showTranslit && w.transliteration && <span className="ml-2 text-sm italic text-muted">{w.transliteration}</span>}
                <span className="block truncate">{w.english}</span>
                {w.partOfSpeech && <span className="block text-xs text-muted">{w.partOfSpeech}</span>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[w.status]}`}>{STATUS_LABEL[w.status]}</span>
                {w.status !== "learned" && (
                  <button
                    type="button"
                    onClick={() => markKnown(w.vocabId)}
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
