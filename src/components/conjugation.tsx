"use client";

import { useEffect, useState } from "react";
import { drawTense, type ConjugationData, type DrawnSegment, type Tense } from "@/lib/conjugation";
import { getConjugation, type ConjugationResult } from "@/app/(app)/conjugation/actions";

const TABS: { id: Tense; label: string }[] = [
  { id: "present", label: "Present" },
  { id: "past", label: "Past" },
  { id: "future", label: "Future" },
];
const TAB_KEY = "milim-conjugation-tab";
const COLOR: Record<DrawnSegment["type"], string> = { prefix: "text-seg-prefix", stem: "text-seg-stem", suffix: "text-seg-suffix" };

function rememberedTab(): Tense {
  try {
    const t = localStorage.getItem(TAB_KEY);
    if (t === "present" || t === "past" || t === "future") return t;
  } catch {
    // No storage: start on the first tab.
  }
  return "present";
}

// The "Conjugation" button on a verb's card. It opens the full-screen view for that verb.
export function ConjugationButton({
  vocabId,
  lemma,
  english,
  showTranslit,
  showNikud,
  load = getConjugation,
}: {
  vocabId: string;
  lemma: string;
  english: string;
  showTranslit: boolean;
  showNikud: boolean;
  /** Where the forms come from (replaced in tests). */
  load?: (vocabId: string) => Promise<ConjugationResult>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-accent font-semibold text-accent hover:bg-accent/10"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h16M4 12h10M4 18h6" />
        </svg>
        Conjugation
      </button>
      {open && <ConjugationPanel vocabId={vocabId} lemma={lemma} english={english} showTranslit={showTranslit} showNikud={showNikud} load={load} onClose={() => setOpen(false)} />}
    </>
  );
}

function ConjugationPanel({
  vocabId,
  lemma,
  english,
  showTranslit,
  showNikud,
  load,
  onClose,
}: {
  vocabId: string;
  lemma: string;
  english: string;
  showTranslit: boolean;
  showNikud: boolean;
  load: (vocabId: string) => Promise<ConjugationResult>;
  onClose: () => void;
}) {
  const [tense, setTense] = useState<Tense>(rememberedTab);
  const [result, setResult] = useState<ConjugationResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load(vocabId)
      .catch((): ConjugationResult => ({ ok: false, error: "Couldn't load the forms. Please try again." }))
      .then((r) => {
        if (!cancelled) setResult(r);
      });
    return () => {
      cancelled = true;
    };
  }, [vocabId, load, attempt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pick(t: Tense) {
    setTense(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      // Not remembered, still works.
    }
  }

  const data: ConjugationData | null = result?.ok ? result.data : null;
  const groups = data ? drawTense(data, tense, showNikud) : [];

  return (
    <div role="dialog" aria-modal="true" aria-label="Conjugation" className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted">Conjugation</span>
            <span className="flex flex-wrap items-baseline gap-x-3">
              <span lang="he" className="hebrew text-3xl text-accent">
                {data ? (showNikud ? data.infinitive.vocalized : data.infinitive.plain) : lemma}
              </span>
              <span>{english}</span>
            </span>
            {data && showTranslit && <span className="text-sm italic text-muted">{data.infinitive.translit}</span>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="h-10 w-10 shrink-0 rounded-full border border-border text-xl text-muted hover:bg-surface">
            ×
          </button>
        </div>

        {!result && <p className="rounded-xl border border-border bg-surface p-6 text-center text-muted">Working out the forms… the first time can take a few seconds.</p>}

        {result && !result.ok && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="font-medium">We couldn&apos;t load the forms</p>
            <p className="text-sm text-muted">{result.error}</p>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAttempt((a) => a + 1);
              }}
              className="h-10 rounded-xl border border-border px-5 font-semibold hover:bg-surface"
            >
              Try again
            </button>
          </div>
        )}

        {data && (
          <>
            <div role="tablist" aria-label="Tense" className="flex gap-1 rounded-xl border border-border bg-surface p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tense === t.id}
                  onClick={() => pick(t.id)}
                  className={`h-10 flex-1 rounded-lg text-sm font-semibold transition-colors ${tense === t.id ? "bg-accent text-accent-contrast" : "text-muted hover:text-foreground"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span><span className="font-bold text-seg-prefix">■</span> prefix: who</span>
              <span><span className="font-bold text-seg-stem">■</span> stem: the verb</span>
              <span><span className="font-bold text-seg-suffix">■</span> suffix: number / gender</span>
            </p>

            {groups.map((g) => (
              <section key={g.name} className="flex flex-col gap-1.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">{g.name}</h2>
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                  {g.rows.map((r, i) => (
                    <div key={`${r.label}-${i}`} className="flex items-center gap-3 px-3.5 py-2.5">
                      <span className="w-[4.6rem] shrink-0 text-sm text-muted">{r.label}</span>
                      <div className="flex flex-1 flex-col gap-1.5">
                        {r.lines.map((l, j) => (
                          <div key={j} className="flex items-center justify-between gap-3">
                            <span className="shrink-0 rounded-full border border-border px-2 text-[11px] text-muted">{l.tag}</span>
                            <div className="flex flex-col items-end">
                              <span lang="he" dir="rtl" className="hebrew text-2xl">
                                {l.segments.map((s, k) => (
                                  <span key={k} className={COLOR[s.type]}>
                                    {s.text}
                                  </span>
                                ))}
                              </span>
                              {showTranslit && (
                                <span className="text-sm italic">
                                  {l.segments.map((s, k) => (
                                    <span key={k} className={COLOR[s.type]}>
                                      {s.translit}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {r.sameSpelling && <span className="text-xs italic text-muted">Same spelling without nikud</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
