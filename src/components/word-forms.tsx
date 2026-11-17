"use client";

import { useEffect, useState } from "react";
import { drawTense, type ConjugationData, type DrawnSegment, type Tense } from "@/lib/conjugation";
import { drawSegments, joinedText, type AdjectiveForms, type FormsKind, type NounForms, type WordForms } from "@/lib/word-forms";
import { getWordForms, type FormsResult } from "@/app/(app)/word-forms/actions";

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

// The button on a word's card: "Conjugation" for verbs, "Forms" for nouns and adjectives. It opens a
// full-screen view for that word.
export function FormsButton({
  vocabId,
  kind,
  lemma,
  english,
  showTranslit,
  showNikud,
  load = getWordForms,
}: {
  vocabId: string;
  kind: FormsKind;
  lemma: string;
  english: string;
  showTranslit: boolean;
  showNikud: boolean;
  /** Where the forms come from (replaced in tests). */
  load?: (vocabId: string) => Promise<FormsResult>;
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
        {kind === "verb" ? "Conjugation" : "Forms"}
      </button>
      {open && (
        <FormsPanel vocabId={vocabId} kind={kind} lemma={lemma} english={english} showTranslit={showTranslit} showNikud={showNikud} load={load} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <span key={i.label}>
          <span className={`font-bold ${i.color}`}>■</span> {i.label}
        </span>
      ))}
    </p>
  );
}

function Hebrew({ segments, showTranslit, size }: { segments: DrawnSegment[]; showTranslit: boolean; size: string }) {
  return (
    <div className="flex flex-col items-end">
      <span lang="he" dir="rtl" className={`hebrew ${size}`}>
        {segments.map((s, k) => (
          <span key={k} className={COLOR[s.type]}>
            {s.text}
          </span>
        ))}
      </span>
      {showTranslit && (
        <span className="text-sm italic">
          {segments.map((s, k) => (
            <span key={k} className={COLOR[s.type]}>
              {s.translit}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function VerbBody({ data, showTranslit, showNikud }: { data: ConjugationData; showTranslit: boolean; showNikud: boolean }) {
  const [tense, setTense] = useState<Tense>(rememberedTab);
  const groups = drawTense(data, tense, showNikud);
  function pick(t: Tense) {
    setTense(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      // Not remembered, still works.
    }
  }
  return (
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
      <Legend
        items={[
          { color: "text-seg-prefix", label: "prefix: who" },
          { color: "text-seg-stem", label: "stem: the verb" },
          { color: "text-seg-suffix", label: "suffix: number / gender" },
        ]}
      />
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
                      <Hebrew segments={l.segments} showTranslit={showTranslit} size="text-2xl" />
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
  );
}

function NounBody({ data, showTranslit, showNikud }: { data: NounForms; showTranslit: boolean; showNikud: boolean }) {
  const rows = [
    { label: "Singular", segments: drawSegments(data.singular, showNikud) },
    { label: "Plural", segments: drawSegments(data.plural, showNikud) },
  ];
  return (
    <>
      <p className="flex items-center gap-2 text-sm text-muted">
        <span className="rounded-full border border-accent px-3 py-0.5 text-xs font-semibold text-accent">{data.gender}</span>
        A noun keeps its gender, in singular and plural.
      </p>
      <Legend
        items={[
          { color: "text-seg-stem", label: "stem: the word" },
          { color: "text-seg-suffix", label: "ending: number" },
        ]}
      />
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 px-4 py-4">
            <span className="w-[4.6rem] shrink-0 text-sm text-muted">{r.label}</span>
            <div className="flex-1">
              <Hebrew segments={r.segments} showTranslit={showTranslit} size="text-3xl" />
            </div>
          </div>
        ))}
      </div>
      {data.note.trim() && <p className="border-l-2 border-border pl-3 text-sm text-muted">{data.note}</p>}
    </>
  );
}

function AdjectiveBody({ data, showTranslit, showNikud }: { data: AdjectiveForms; showTranslit: boolean; showNikud: boolean }) {
  const cells: { label: string; forms: { key: string; segments: DrawnSegment[] }[] }[] = [
    { label: "Masc.", forms: [{ key: "ms", segments: drawSegments(data.ms, showNikud) }, { key: "mp", segments: drawSegments(data.mp, showNikud) }] },
    { label: "Fem.", forms: [{ key: "fs", segments: drawSegments(data.fs, showNikud) }, { key: "fp", segments: drawSegments(data.fp, showNikud) }] },
  ];
  return (
    <>
      <p className="text-sm text-muted">An adjective matches the word it describes: masculine or feminine, one or many.</p>
      <Legend
        items={[
          { color: "text-seg-stem", label: "stem: the word" },
          { color: "text-seg-suffix", label: "ending: gender / number" },
        ]}
      />
      <div className="grid grid-cols-[auto_repeat(2,minmax(0,1fr))] items-stretch gap-2">
        <div />
        <div className="pb-0.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">Singular</div>
        <div className="pb-0.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">Plural</div>
        {cells.map((row) => (
          <div key={row.label} className="contents">
            <div className="flex items-center justify-center text-[11px] font-semibold uppercase tracking-wider text-muted [writing-mode:vertical-rl] rotate-180">{row.label}</div>
            {row.forms.map((f) => (
              <div key={f.key} className="flex flex-col items-center rounded-2xl border border-border bg-surface px-2 py-5 text-center">
                <Hebrew segments={f.segments} showTranslit={showTranslit} size="text-3xl" />
              </div>
            ))}
          </div>
        ))}
      </div>
      {data.note.trim() && <p className="border-l-2 border-border pl-3 text-sm text-muted">{data.note}</p>}
    </>
  );
}

function baseWord(forms: WordForms, nikud: boolean): string {
  if (forms.kind === "verb") return nikud ? forms.data.infinitive.vocalized : forms.data.infinitive.plain;
  if (forms.kind === "noun") return joinedText(forms.data.singular, nikud);
  return joinedText(forms.data.ms, nikud);
}

function FormsPanel({
  vocabId,
  kind,
  lemma,
  english,
  showTranslit,
  showNikud,
  load,
  onClose,
}: {
  vocabId: string;
  kind: FormsKind;
  lemma: string;
  english: string;
  showTranslit: boolean;
  showNikud: boolean;
  load: (vocabId: string) => Promise<FormsResult>;
  onClose: () => void;
}) {
  const [result, setResult] = useState<FormsResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load(vocabId)
      .catch((): FormsResult => ({ ok: false, error: "Couldn't load the forms. Please try again." }))
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

  const forms = result?.ok ? result.forms : null;
  const title = kind === "verb" ? "Conjugation" : `Forms · ${kind}`;

  return (
    <div role="dialog" aria-modal="true" aria-label={kind === "verb" ? "Conjugation" : "Forms"} className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted">{title}</span>
            <span className="flex flex-wrap items-baseline gap-x-3">
              <span lang="he" className="hebrew text-3xl text-accent">
                {forms ? baseWord(forms, showNikud) : lemma}
              </span>
              <span>{english}</span>
            </span>
            {forms?.kind === "verb" && showTranslit && <span className="text-sm italic text-muted">{forms.data.infinitive.translit}</span>}
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

        {forms?.kind === "verb" && <VerbBody data={forms.data} showTranslit={showTranslit} showNikud={showNikud} />}
        {forms?.kind === "noun" && <NounBody data={forms.data} showTranslit={showTranslit} showNikud={showNikud} />}
        {forms?.kind === "adjective" && <AdjectiveBody data={forms.data} showTranslit={showTranslit} showNikud={showNikud} />}
      </div>
    </div>
  );
}
