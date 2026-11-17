"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { isSectionLabel } from "@/lib/lyrics";
import { splitTokens, type EditActions, type PendingSuggestion, type SongDetails, type VocabDraft } from "@/lib/editing";
import type { WordStatus } from "@/lib/study";
import { useEditMode } from "./edit-mode";
import { AddWordSheet, DetailsSheet, LineSheet, RemoveWordSheet, SuggestSheet } from "./edit-sheets";

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
  | null;

export function SongView({
  songId,
  lines: initialLines,
  words: initialWords,
  showTranslit,
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
  const [wordsOpen, setWordsOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const editMode = isOwner && editing;
  const vocabOpen = wordsOpen || editMode;

  // Section labels (Verse, Chorus...) are headings, not tappable lines.
  const lyricLines = lines.filter((l) => !isSectionLabel(l.hebrew));
  const allRevealed = lyricLines.length > 0 && lyricLines.every((l) => revealed.has(l.id));
  const lineById = (id: string) => lines.find((l) => l.id === id);

  function toggleLine(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function patchLine(id: string, f: { english: string; transliteration: string; hebrew: string }) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, english: f.english, transliteration: f.transliteration || null, hebrew: f.hebrew } : l)));
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
  const removing = sheet?.kind === "remove" ? words.find((w) => w.id === sheet.id) : null;

  return (
    <div className="flex flex-col gap-8">
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
                      {line.hebrew}
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

      <section aria-label="Lyrics" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {editMode ? (
            <>
              <p className="text-sm text-muted">Tap a Hebrew word to add it to the Song Vocabulary.</p>
              <button type="button" onClick={() => setSheet({ kind: "details" })} className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface-2">
                Song details
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(allRevealed ? new Set() : new Set(lyricLines.map((l) => l.id)))}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
            >
              {allRevealed ? "Hide all English" : "Show all English"}
            </button>
          )}
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
            if (editMode) {
              return (
                <li key={line.id} className="flex flex-col gap-2 rounded-xl border border-accent/40 bg-surface px-4 py-3">
                  <span lang="he" className="hebrew flex flex-wrap justify-end gap-x-2 text-xl">
                    {splitTokens(line.hebrew).map((t, i) => {
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
                {open && canSuggest && !isOwner && (
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: "suggest", id: line.id })}
                    className="mt-1 px-2 text-xs text-muted underline underline-offset-2 hover:text-foreground"
                  >
                    Suggest a change
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Song Vocabulary" className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setWordsOpen((o) => !o)}
          aria-expanded={vocabOpen}
          aria-controls="song-vocabulary-list"
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left hover:bg-surface-2"
        >
          <span className="text-lg font-semibold">Song Vocabulary ({words.length})</span>
          <span aria-hidden className="text-2xl leading-none text-accent">
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
                        {w.lemma}
                      </span>
                      {showTranslit && w.transliteration && <span className="block text-sm italic text-muted">{w.transliteration}</span>}
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
