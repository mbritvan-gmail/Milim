"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { fixLinePunctuation, isSectionLabel } from "@/lib/lyrics";
import { buildLyricItems } from "@/lib/lyric-repeats";
import { moveInList, startDrag } from "@/lib/drag-reorder";
import { describeSection } from "@/lib/sections";
import { hebrewText } from "@/lib/modules";
import { cleanToken, splitTokens, type EditActions, type PendingSuggestion, type SongDetails, type VocabDraft } from "@/lib/editing";
import type { WordStatus } from "@/lib/study";
import { useEditMode } from "@/components/edit-mode";
import { AddWordSheet, DetailsSheet, LineSheet, RemoveWordSheet, SectionSheet, SuggestSheet } from "./edit-sheets";

export type SongLine = { id: string; hebrew: string; transliteration: string | null; english: string | null; vocalized?: string | null };
export type SongWord = {
  id: string;
  lemma: string;
  surface_form: string;
  transliteration: string | null;
  english: string;
  part_of_speech: string | null;
  vocalized?: string | null;
  status: WordStatus;
  count: number;
  /** Where the word came from, kept so a removal can be undone exactly. */
  line_id: string | null;
  source: string;
};

type Sheet =
  | { kind: "line"; id: string }
  | { kind: "add"; lineId: string; token: string }
  | { kind: "remove"; id: string }
  | { kind: "details" }
  | { kind: "suggest"; id: string }
  | { kind: "section"; mode: "add"; beforeId: string }
  | { kind: "section"; mode: "rename"; id: string }
  | null;

// Compares Hebrew words ignoring vowel marks and punctuation.
const bareHebrew = (text: string) => cleanToken(text).replace(/[\u0591-\u05C7]/g, "");

const gripIcon = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
);
const trashIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);
const chevronIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

function RepeatIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </svg>
  );
}

export function SongView({
  songId,
  lines: initialLines,
  words: initialWords,
  showTranslit,
  showNikud,
  learnAfter,
  isOwner,
  canSuggest,
  details: initialDetails,
  pending: initialPending,
  actions,
}: {
  songId: string;
  lines: SongLine[];
  words: SongWord[];
  /** The person's "show pronunciation" setting (changed on the Settings page). */
  showTranslit: boolean;
  /** The person's "show nikud" setting; used for lines and words that have nikud saved. */
  showNikud: boolean;
  learnAfter: number;
  isOwner: boolean;
  canSuggest: boolean;
  details: SongDetails;
  pending: PendingSuggestion[];
  actions: EditActions;
}) {
  const router = useRouter();
  const { editing, showToast } = useEditMode();
  const [lines, setLines] = useState(initialLines);
  const [words, setWords] = useState(initialWords);
  const [details, setDetails] = useState(initialDetails);
  const [pending, setPending] = useState(initialPending);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  // Which collapsed repeats (section bands and "Repeats N×" chips) are opened.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [wordsOpen, setWordsOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  // Dragging a section header: the rows by id, the current order, and which header is being dragged.
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const latest = useRef(initialLines);
  const [dragId, setDragId] = useState<string | null>(null);
  const keyBase = useRef<string[] | null>(null);
  const keySnapshot = useRef<SongLine[] | null>(null);
  const keyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    latest.current = lines;
  }, [lines]);
  const editMode = isOwner && editing;
  const suggestMode = canSuggest && !isOwner && editing;
  const vocabOpen = wordsOpen || editMode;

  // Section labels (Verse, Chorus...) are headings, not tappable lines.
  const lyricLines = lines.filter((l) => !isSectionLabel(l.hebrew));
  const allRevealed = lyricLines.length > 0 && lyricLines.every((l) => revealed.has(l.id));
  const lineById = (id: string) => lines.find((l) => l.id === id);
  // The line as shown: with nikud when the person wants it and the line has it.
  const lineText = (l: SongLine) => fixLinePunctuation(showNikud && l.vocalized ? l.vocalized : l.hebrew);

  // Tapping a row reveals or hides its English. A collapsed repeat block passes every line it stands for.
  function toggleLine(ids: string[]) {
    setRevealed((prev) => {
      const next = new Set(prev);
      const on = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (on) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const lyricItems = useMemo(() => buildLyricItems(lines, expanded), [lines, expanded]);

  function patchLine(id: string, f: { english: string; transliteration: string; hebrew: string }) {
    setLines((ls) =>
      ls.map((l) =>
        l.id === id ? { ...l, english: f.english, transliteration: f.transliteration || null, hebrew: f.hebrew, vocalized: f.hebrew === l.hebrew ? l.vocalized : null } : l,
      ),
    );
  }

  // ---- edit a line -------------------------------------------------------
  async function saveLine(lineId: string, f: { english: string; transliteration: string; hebrew: string }) {
    const r = await actions.updateLine(songId, lineId, f);
    if (!r.ok) return r.error;
    patchLine(lineId, f);
    setSheet(null);
    showToast("Line updated", async () => {
      const back = await actions.updateLine(songId, lineId, r.previous);
      if (back.ok) patchLine(lineId, r.previous);
    });
    return null;
  }

  // ---- section headers (Verse, Chorus...) --------------------------------
  const sectionName = (l: SongLine) => l.english || l.hebrew.replace(/^\[|\]$/g, "");
  const insertBefore = (ls: SongLine[], beforeId: string | null, made: SongLine) => {
    const next = [...ls];
    const i = beforeId ? next.findIndex((l) => l.id === beforeId) : -1;
    next.splice(i < 0 ? next.length : i, 0, made);
    return next;
  };

  async function addSection(beforeId: string, label: string) {
    const r = await actions.addSection(songId, beforeId, label);
    if (!r.ok) return r.error;
    setLines((ls) => insertBefore(ls, beforeId, { id: r.id, hebrew: r.hebrew, english: r.english, transliteration: null }));
    setSheet(null);
    showToast(`Added ${r.english ?? r.hebrew}`, async () => {
      const back = await actions.removeSection(songId, r.id);
      if (back.ok) setLines((ls) => ls.filter((l) => l.id !== r.id));
    });
    return null;
  }

  async function renameSection(line: SongLine, label: string) {
    const r = await actions.renameSection(songId, line.id, label);
    if (!r.ok) return r.error;
    setLines((ls) => ls.map((l) => (l.id === line.id ? { ...l, hebrew: label, english: r.english } : l)));
    setSheet(null);
    showToast("Section renamed", async () => {
      const back = await actions.renameSection(songId, line.id, r.previous);
      if (back.ok) setLines((ls) => ls.map((l) => (l.id === line.id ? { ...l, hebrew: r.previous, english: back.english } : l)));
    });
    return null;
  }

  async function removeSection(line: SongLine) {
    const r = await actions.removeSection(songId, line.id);
    if (!r.ok) {
      showToast(r.error);
      return;
    }
    setLines((ls) => ls.filter((l) => l.id !== line.id));
    showToast(`Removed ${sectionName(line)}`, async () => {
      const back = await actions.addSection(songId, r.beforeLineId, r.hebrew);
      if (back.ok) setLines((ls) => insertBefore(ls, r.beforeLineId, { id: back.id, hebrew: back.hebrew, english: back.english, transliteration: null }));
    });
  }

  const lineIds = () => latest.current.map((l) => l.id);
  function moveRow(id: string, target: number) {
    setLines((ls) => moveInList(ls, id, target));
  }
  async function saveOrder(before: string[], snapshot: SongLine[]) {
    const after = lineIds();
    if (after.join() === before.join()) return;
    const r = await actions.reorderLines(songId, after).catch(() => ({ ok: false as const, error: "Couldn't save the new order. Please try again." }));
    if (!r.ok) {
      setLines(snapshot);
      showToast(r.error);
      return;
    }
    showToast("Section moved", async () => {
      const back = await actions.reorderLines(songId, before);
      if (back.ok) {
        const place = new Map(before.map((id, i) => [id, i]));
        setLines((ls) => [...ls].sort((a, b) => (place.get(a.id) ?? 0) - (place.get(b.id) ?? 0)));
      }
    });
  }
  function dragSection(e: React.PointerEvent, line: SongLine) {
    const snapshot = latest.current;
    startDrag(e, line.id, {
      refs: rowRefs.current,
      getIds: lineIds,
      onMove: moveRow,
      onActive: setDragId,
      onDrop: (before) => void saveOrder(before, snapshot),
    });
  }
  // Arrow keys on the grip move the header one place; saved a moment after the last press.
  function keyMoveSection(e: React.KeyboardEvent, id: string) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const ids = lineIds();
    const from = ids.indexOf(id);
    const target = e.key === "ArrowUp" ? Math.max(0, from - 1) : Math.min(ids.length - 1, from + 1);
    if (target === from) return;
    if (!keyBase.current) {
      keyBase.current = ids;
      keySnapshot.current = latest.current;
    }
    moveRow(id, target);
    if (keyTimer.current) clearTimeout(keyTimer.current);
    keyTimer.current = setTimeout(() => {
      const base = keyBase.current ?? ids;
      const snapshot = keySnapshot.current ?? latest.current;
      keyBase.current = null;
      void saveOrder(base, snapshot);
    }, 700);
  }
  const setRowRef = (id: string) => (el: HTMLElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  };

  // ---- add a word --------------------------------------------------------
  function tapToken(line: SongLine, token: string) {
    if (!token) return;
    const have = words.find((w) => w.surface_form === token || w.lemma === token);
    if (have) {
      showToast(`${token} is already in the Song Vocabulary`);
      return;
    }
    setSheet({ kind: "add", lineId: line.id, token });
  }

  async function addWord(lineId: string, token: string, draft: VocabDraft) {
    const r = await actions.addVocabulary(songId, lineId, token, draft);
    if (!r.ok) return r.error;
    const w = r.word;
    setWords((ws) => [
      ...ws,
      {
        id: w.vocabId,
        lemma: w.lemma,
        surface_form: w.surfaceForm,
        transliteration: w.transliteration,
        english: w.english,
        part_of_speech: w.partOfSpeech,
        status: w.status,
        count: w.count,
        line_id: w.lineId,
        source: "user",
      },
    ]);
    setSheet(null);
    showToast(`Added ${w.lemma}`, async () => {
      const back = await actions.removeVocabulary(songId, w.vocabId);
      if (back.ok) setWords((ws) => ws.filter((x) => x.id !== w.vocabId));
    });
    return null;
  }

  // ---- remove a word -----------------------------------------------------
  async function removeWord(word: SongWord) {
    const r = await actions.removeVocabulary(songId, word.id);
    if (!r.ok) return r.error;
    setWords((ws) => ws.filter((x) => x.id !== word.id));
    setSheet(null);
    showToast(`Removed ${word.lemma}`, async () => {
      const back = await actions.restoreVocabulary(songId, r.restore);
      if (back.ok) setWords((ws) => (ws.some((x) => x.id === word.id) ? ws : [...ws, word]));
    });
    return null;
  }

  // ---- song details ------------------------------------------------------
  async function saveDetails(d: SongDetails) {
    const r = await actions.updateSongDetails(songId, d);
    if (!r.ok) return r.error;
    setDetails(d);
    setSheet(null);
    router.refresh();
    showToast("Song details updated", async () => {
      const back = await actions.updateSongDetails(songId, r.previous);
      if (back.ok) {
        setDetails(r.previous);
        router.refresh();
      }
    });
    return null;
  }

  // ---- suggestions -------------------------------------------------------
  async function sendSuggestion(lineId: string, text: string, note: string) {
    const r = await actions.suggestLineChange(songId, lineId, text, note);
    if (!r.ok) return r.error;
    setSheet(null);
    showToast("Suggestion sent to the song's owner");
    return null;
  }

  async function resolve(s: PendingSuggestion, decision: "approve" | "reject") {
    const r = await actions.resolveSuggestion(songId, s.id, decision);
    if (!r.ok) {
      showToast(r.error);
      return;
    }
    setPending((p) => p.filter((x) => x.id !== s.id));
    if (decision === "approve") setLines((ls) => ls.map((l) => (l.id === r.lineId ? { ...l, english: r.text } : l)));
    showToast(decision === "approve" ? "Suggestion approved" : "Suggestion rejected", async () => {
      const back = await actions.reopenSuggestion(songId, s.id, r.lineId, r.previousEnglish, decision === "approve");
      if (back.ok) {
        setPending((p) => [...p, s]);
        if (decision === "approve") setLines((ls) => ls.map((l) => (l.id === r.lineId ? { ...l, english: r.previousEnglish } : l)));
      }
    });
  }

  const sheetLine = sheet && "id" in sheet && sheet.kind !== "remove" ? lineById(sheet.id) : null;
  const sectionLine = sheet?.kind === "section" && sheet.mode === "rename" ? lineById(sheet.id) : null;
  const removing = sheet?.kind === "remove" ? words.find((w) => w.id === sheet.id) : null;

  return (
    <div className="flex flex-col gap-[14px]">
      {isOwner && pending.length > 0 && (
        <section aria-label="Suggestions" className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-surface p-4">
          <h2 className="text-lg font-semibold">Suggestions ({pending.length})</h2>
          <ul className="flex flex-col gap-3">
            {pending.map((s) => {
              const line = lineById(s.lineId);
              return (
                <li key={s.id} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                  {line && (
                    <span lang="he" className="hebrew text-lg">
                      {lineText(line)}
                    </span>
                  )}
                  <span className="text-sm text-muted">Now: {line?.english || "(none)"}</span>
                  <span className="text-sm text-accent">Suggested: {s.text}</span>
                  {s.note && <span className="text-xs text-muted">“{s.note}”</span>}
                  <span className="text-xs text-muted">from {s.by}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => resolve(s, "reject")} className="h-9 flex-1 rounded-lg border border-border text-sm hover:bg-surface-2">
                      Reject
                    </button>
                    <button type="button" onClick={() => resolve(s, "approve")} className="h-9 flex-1 rounded-lg bg-accent text-sm font-semibold text-accent-contrast hover:bg-accent-strong">
                      Approve
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-label="Lyrics" className="flex flex-col gap-[14px]">
        <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {suggestMode ? (
            <p className="text-sm text-muted">Tap a line to suggest better English. The song&apos;s owner reviews it before anything changes.</p>
          ) : editMode ? (
            <>
              <p className="text-sm text-muted">Tap a Hebrew word to add it to the Song Vocabulary.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setSheet({ kind: "details" })} className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface-2">
                  Title, artist &amp; link
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold">Lyrics</h2>
              <button
                type="button"
                aria-pressed={allRevealed}
                onClick={() => setRevealed(allRevealed ? new Set() : new Set(lyricLines.map((l) => l.id)))}
                className={`inline-flex h-[38px] items-center gap-[7px] rounded-full border border-[var(--sp-accent)] px-3.5 text-sm font-semibold ${allRevealed ? "bg-[var(--sp-accent)] text-[var(--sp-on-accent)]" : "bg-[var(--sp-card)] text-[var(--sp-accent)]"}`}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {allRevealed ? "Hide English" : "Show English"}
              </button>
            </>
          )}
        </div>
        {!editMode && !suggestMode && lyricLines.length > 0 && <p className="text-[13px] text-[var(--sp-muted)]">Tap a line to reveal its English.</p>}
        </div>

        {!editMode && !suggestMode ? (
          <div className="sp-card overflow-hidden">
            {lyricItems.map((it) => {
              if (it.kind === "band") {
                return (
                  <div key={it.key} className="sp-band">
                    <span className="text-xs font-bold text-[var(--sp-accent-ink)]">{it.english}</span>
                    {it.hebrew && (
                      <span lang="he" dir="rtl" className="text-[13px] text-[var(--sp-muted)]">
                        {it.hebrew}
                      </span>
                    )}
                  </div>
                );
              }
              if (it.kind === "repeatBand") {
                return (
                  <button key={it.key} type="button" aria-expanded={it.open} onClick={() => toggleExpanded(it.key)} className="sp-band w-full text-start">
                    <span className="text-xs font-bold text-[var(--sp-accent-ink)]">{it.english}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sp-accent-ink)]">
                      <RepeatIcon size={14} />
                      Repeat
                    </span>
                    <span lang="he" dir="rtl" className="min-w-[2ch] text-[13px] text-[var(--sp-muted)]">
                      {it.hebrew}
                    </span>
                  </button>
                );
              }
              if (it.kind === "chip") {
                return (
                  <div key={it.key} className="px-[18px] pb-0.5 pt-3">
                    <button type="button" aria-expanded={it.open} onClick={() => toggleExpanded(it.key)} className="sp-chip">
                      <RepeatIcon size={13} />
                      Repeats {it.n}×
                    </button>
                  </div>
                );
              }
              if (it.kind === "divider") return <div key={it.key} className="sp-gdiv" />;
              const open = it.ids.every((id) => revealed.has(id));
              const line = it.line;
              return (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => toggleLine(it.ids)}
                  aria-expanded={open}
                  className={`sp-line ${it.last ? "" : "sep"}`}
                >
                  <span lang="he" dir="rtl" className="hebrew sp-he">
                    {lineText(line)}
                  </span>
                  {showTranslit && line.transliteration && <span className="sp-sub sp-tr">{line.transliteration}</span>}
                  {open ? (
                    <span className="sp-sub sp-en">{line.english || "(no translation)"}</span>
                  ) : (
                    <span className="sp-ph" aria-hidden="true">
                      <i />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
        <ul className="flex flex-col gap-2">
          {lines.map((line) => {
            if (isSectionLabel(line.hebrew) && editMode) {
              const name = sectionName(line);
              return (
                <li
                  key={line.id}
                  ref={setRowRef(line.id)}
                  className={`flex items-center gap-1 rounded-xl border bg-surface-2 p-1 ${dragId === line.id ? "border-accent opacity-80" : "border-border"}`}
                >
                  <button
                    type="button"
                    aria-label={`Move ${name}. Drag, or use the up and down arrow keys`}
                    onPointerDown={(e) => dragSection(e, line)}
                    onKeyDown={(e) => keyMoveSection(e, line.id)}
                    className="flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
                  >
                    {gripIcon}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: "section", mode: "rename", id: line.id })}
                    aria-label={`Rename ${name}`}
                    className="flex h-11 min-w-0 flex-1 items-center gap-1.5 text-start font-bold text-accent"
                  >
                    <span className="truncate">{name}</span>
                    {chevronIcon}
                  </button>
                  <button type="button" onClick={() => void removeSection(line)} aria-label={`Remove ${name}`} className="flex h-11 w-11 shrink-0 items-center justify-center text-danger">
                    {trashIcon}
                  </button>
                </li>
              );
            }
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
            if (suggestMode) {
              return (
                <li key={line.id}>
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: "suggest", id: line.id })}
                    className="w-full rounded-xl border border-accent/40 bg-surface px-4 py-3 text-left hover:bg-surface-2"
                  >
                    <span lang="he" className="hebrew block text-right text-xl">
                      {lineText(line)}
                    </span>
                    {showTranslit && line.transliteration && <span className="mt-1 block text-sm italic text-muted">{line.transliteration}</span>}
                    <span className="mt-2 block text-base text-accent">{line.english || "(no translation)"}</span>
                    <span className="mt-2 block text-xs text-muted">✎ Tap to suggest a change</span>
                  </button>
                </li>
              );
            }
            if (editMode) {
              return (
                <li key={line.id} ref={setRowRef(line.id)} className="flex flex-col gap-2 rounded-xl border border-accent/40 bg-surface px-4 py-3">
                  <span lang="he" className="hebrew flex flex-wrap justify-end gap-x-2 text-xl">
                    {splitTokens(fixLinePunctuation(line.hebrew)).map((t, i) => {
                      const known = words.some((w) => t.token && (w.surface_form === t.token || w.lemma === t.token));
                      return t.token ? (
                        <button
                          key={i}
                          type="button"
                          onClick={() => tapToken(line, t.token)}
                          className={`rounded-md px-1 hover:bg-surface-2 ${known ? "text-accent underline decoration-dotted underline-offset-4" : ""}`}
                        >
                          {t.text}
                        </button>
                      ) : (
                        <span key={i}>{t.text}</span>
                      );
                    })}
                  </span>
                  {showTranslit && line.transliteration && <span className="text-sm italic text-muted">{line.transliteration}</span>}
                  <span className="text-base text-accent">{line.english || "(no translation)"}</span>
                  <button type="button" onClick={() => setSheet({ kind: "line", id: line.id })} className="self-start rounded-full border border-border px-3 py-1 text-sm hover:bg-surface-2">
                    ✎ Edit line
                  </button>
                </li>
              );
            }
            return null; // normal reading mode is rendered by the lyrics card above
          })}
        </ul>
        )}
      </section>

      <section aria-label="Song Vocabulary" className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setWordsOpen((o) => !o)}
          aria-expanded={vocabOpen}
          aria-controls="song-vocabulary-list"
          className="sp-card flex h-14 items-center gap-2.5 px-[18px] text-left hover:bg-[var(--sp-band)]"
        >
          <span className="text-base font-bold">Song vocabulary</span>
          <span className="rounded-full bg-[var(--sp-accent-tint)] px-[9px] py-0.5 text-[13px] font-semibold text-[var(--sp-accent-ink)]">{words.length}</span>
          <span aria-hidden className="ml-auto text-2xl leading-none text-[var(--sp-accent)]">
            {vocabOpen ? "−" : "+"}
          </span>
        </button>
        {vocabOpen && <p className="px-1 text-xs text-muted">Words to learn from this song. Your Dictionary collects the words from all your songs.</p>}
        {vocabOpen &&
          (words.length === 0 ? (
            <p className="text-sm text-muted">No vocabulary yet for this song.</p>
          ) : (
            <ul id="song-vocabulary-list" className="grid gap-2">
              {words.map((w) => (
                <li key={w.id} className="flex items-stretch gap-2">
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => setSheet({ kind: "remove", id: w.id })}
                      aria-label={`Remove ${w.lemma} from Song Vocabulary`}
                      className="w-10 shrink-0 rounded-xl border border-border text-lg text-danger hover:bg-surface-2"
                    >
                      ✕
                    </button>
                  )}
                  <Link
                    href={`/dictionary/${w.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 hover:bg-surface-2"
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
                        {hebrewText(w.lemma, w.vocalized, showNikud)}
                      </span>
                      {showTranslit && w.transliteration && <span className="block text-sm italic text-muted">{w.transliteration}</span>}
                      {w.surface_form && bareHebrew(w.surface_form) !== bareHebrew(w.lemma) && (
                        <span className="mt-0.5 block text-xs text-muted">
                          in the song: <span lang="he" className="hebrew">{w.surface_form}</span>
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </section>

      {sheet?.kind === "line" && sheetLine && (
        <LineSheet
          line={{ english: sheetLine.english ?? "", transliteration: sheetLine.transliteration ?? "", hebrew: sheetLine.hebrew }}
          onSave={(f) => saveLine(sheetLine.id, f)}
          onClose={() => setSheet(null)}
          onAddSection={() => setSheet({ kind: "section", mode: "add", beforeId: sheetLine.id })}
        />
      )}
      {sheet?.kind === "section" && sheet.mode === "add" && (
        <SectionSheet title="Add a section above this line" saveLabel="Add section" initialKind="Chorus" initialNumber={0} onSave={(label) => addSection(sheet.beforeId, label)} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === "section" && sheet.mode === "rename" && sectionLine && (
        <SectionSheet
          title="Rename section"
          saveLabel="Save"
          initialKind={describeSection(sectionLine.hebrew).kind}
          initialNumber={describeSection(sectionLine.hebrew).number}
          onSave={(label) => renameSection(sectionLine, label)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === "add" && (
        <AddWordSheet
          token={sheet.token}
          suggest={async () => {
            const r = await actions.suggestWord(songId, sheet.lineId, sheet.token);
            return r.ok ? { draft: r.draft } : { error: r.error };
          }}
          onAdd={(d) => addWord(sheet.lineId, sheet.token, d)}
          onClose={() => setSheet(null)}
        />
      )}
      {removing && <RemoveWordSheet word={removing.lemma} onConfirm={() => removeWord(removing)} onClose={() => setSheet(null)} />}
      {sheet?.kind === "details" && <DetailsSheet details={details} onSave={saveDetails} onClose={() => setSheet(null)} />}
      {sheet?.kind === "suggest" && sheetLine && (
        <SuggestSheet
          hebrew={sheetLine.hebrew}
          current={sheetLine.english ?? ""}
          onSend={(t, n) => sendSuggestion(sheetLine.id, t, n)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
