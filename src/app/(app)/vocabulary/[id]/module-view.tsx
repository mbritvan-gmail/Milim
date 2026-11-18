"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { EditButton, EditModeProvider, useEditMode } from "@/components/edit-mode";
import { Sheet } from "@/components/sheet";
import { CloseButton, useOverlay } from "@/components/overlay";
import { StatusBadge } from "@/components/status-badge";
import { genderLabel, hebrewText } from "@/lib/modules";
import type { WordStatus } from "@/lib/study";
import type { ModuleWord } from "../actions";

export type ModuleRow = ModuleWord & { status: WordStatus; count: number };

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
export type ModuleActions = {
  reorderModuleWords(moduleId: string, orderedIds: string[]): Promise<Result>;
  addModule(moduleId: string): Promise<boolean>;
  makeModulePublic(moduleId: string): Promise<boolean>;
  removeModule(moduleId: string): Promise<void>;
  renameModule(moduleId: string, title: string): Promise<Result<{ previous: string }>>;
  removeModuleWord(moduleId: string, vocabId: string): Promise<Result<{ position: number }>>;
  restoreModuleWord(moduleId: string, vocabId: string, position: number): Promise<Result>;
  addModuleWords(moduleId: string, text: string): Promise<Result<{ words: ModuleWord[] }>>;
};

type Props = {
  moduleId: string;
  title: string;
  isOwner: boolean;
  isPublic: boolean;
  added: boolean;
  archived: boolean;
  by: string;
  words: ModuleRow[];
  showTranslit: boolean;
  showNikud: boolean;
  learnAfter: number;
  actions: ModuleActions;
};

export function ModuleView(props: Props) {
  return (
    <EditModeProvider>
      <ModuleScreen {...props} />
    </EditModeProvider>
  );
}

type Sheets = { kind: "remove-word"; word: ModuleRow } | { kind: "rename" } | { kind: "remove-module" } | { kind: "public" } | null;

function ModuleScreen({ moduleId, title: initialTitle, isOwner, isPublic: initialPublic, added: initialAdded, archived, by, words: initialWords, showTranslit, showNikud, learnAfter, actions }: Props) {
  const router = useRouter();
  const inOverlay = useOverlay() !== null;
  const { editing, showToast } = useEditMode();
  const [title, setTitle] = useState(initialTitle);
  const [words, setWords] = useState(initialWords);
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [added, setAdded] = useState(initialAdded);
  const [sheet, setSheet] = useState<Sheets>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [draft, setDraft] = useState("");
  const [pasting, setPasting] = useState("");
  const [pending, startTransition] = useTransition();
  const editMode = isOwner && editing;

  // ---- reorder (drag the handle, or use the arrow keys on it) ------------
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const [dragId, setDragId] = useState<string | null>(null);
  const startOrder = useRef<string[]>([]);
  const wordsRef = useRef(words);
  useEffect(() => {
    wordsRef.current = words;
  });

  async function saveOrder(before: string[]) {
    const ids = wordsRef.current.map((w) => w.id);
    if (ids.join() === before.join()) return;
    const r = await actions.reorderModuleWords(moduleId, ids).catch((): Result => ({ ok: false, error: "Couldn't save the new order. Please try again." }));
    if (r.ok) {
      showToast("Order saved");
    } else {
      // Put the list back the way it was.
      setWords((ws) => before.map((id) => ws.find((w) => w.id === id)).filter((w): w is ModuleRow => Boolean(w)));
      showToast(r.error);
    }
  }

  function moveTo(id: string, target: number) {
    setWords((ws) => {
      const from = ws.findIndex((w) => w.id === id);
      if (from < 0 || from === target) return ws;
      const next = [...ws];
      const [item] = next.splice(from, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  // Dragging listens on the window, not the handle: moving a row in the list can make the browser
  // drop its hold on the pointer.
  const dragRef = useRef<string | null>(null);

  function dragMove(y: number) {
    const id = dragRef.current;
    if (!id) return;
    // Where the pointer is among the rows (using each row's middle) decides the new place.
    const others = wordsRef.current.filter((w) => w.id !== id);
    let target = others.length;
    for (let i = 0; i < others.length; i++) {
      const el = itemRefs.current.get(others[i].id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        target = i;
        break;
      }
    }
    moveTo(id, target);
    // Scroll when the pointer is near the top or bottom edge of the screen.
    const edge = 90;
    const step = y < edge ? -14 : y > window.innerHeight - edge ? 14 : 0;
    if (step) {
      window.scrollBy(0, step);
      itemRefs.current.get(id)?.closest<HTMLElement>("[role=dialog]")?.scrollBy(0, step);
    }
  }

  function onHandleDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    e.preventDefault();
    startOrder.current = wordsRef.current.map((w) => w.id);
    dragRef.current = id;
    setDragId(id);
    const move = (ev: PointerEvent) => dragMove(ev.clientY);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      dragRef.current = null;
      setDragId(null);
      void saveOrder(startOrder.current);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function onHandleKey(e: React.KeyboardEvent<HTMLButtonElement>, id: string) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const before = wordsRef.current.map((w) => w.id);
    const from = before.indexOf(id);
    const target = e.key === "ArrowUp" ? Math.max(0, from - 1) : Math.min(before.length - 1, from + 1);
    if (target === from) return;
    moveTo(id, target);
    // Saved once the keys stop (a short pause after the last press).
    if (!keyBase.current) keyBase.current = before;
    if (keyTimer.current) clearTimeout(keyTimer.current);
    keyTimer.current = setTimeout(() => {
      const base = keyBase.current ?? before;
      keyBase.current = null;
      void saveOrder(base);
    }, 700);
  }
  const keyBase = useRef<string[] | null>(null);
  const keyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const learned = words.filter((w) => w.status === "learned").length;
  const toLearn = words.length - learned;

  async function add() {
    setBusy(true);
    setProblem("");
    const ok = await actions.addModule(moduleId).catch(() => false);
    setBusy(false);
    if (ok) {
      setAdded(true);
      router.refresh();
    } else setProblem("Couldn't add this Pack. Please try again.");
  }

  async function rename() {
    setBusy(true);
    setProblem("");
    const r = await actions.renameModule(moduleId, draft).catch((): Result<{ previous: string }> => ({ ok: false, error: "Couldn't save that. Please try again." }));
    setBusy(false);
    if (!r.ok) return setProblem(r.error);
    const next = draft.trim();
    setTitle(next);
    setSheet(null);
    showToast("Title updated", async () => {
      const back = await actions.renameModule(moduleId, r.previous);
      if (back.ok) setTitle(r.previous);
    });
  }

  async function removeWord(word: ModuleRow) {
    setBusy(true);
    setProblem("");
    const r = await actions.removeModuleWord(moduleId, word.id).catch((): Result<{ position: number }> => ({ ok: false, error: "Couldn't remove that word. Please try again." }));
    setBusy(false);
    if (!r.ok) return setProblem(r.error);
    setWords((ws) => ws.filter((w) => w.id !== word.id));
    setSheet(null);
    showToast(`Removed ${word.lemma}`, async () => {
      const back = await actions.restoreModuleWord(moduleId, word.id, r.position);
      if (back.ok) setWords((ws) => (ws.some((w) => w.id === word.id) ? ws : [...ws, word]));
    });
  }

  async function addWords() {
    setBusy(true);
    setProblem("");
    const r = await actions.addModuleWords(moduleId, pasting).catch((): Result<{ words: ModuleWord[] }> => ({ ok: false, error: "Couldn't add those words. Please try again." }));
    setBusy(false);
    if (!r.ok) return setProblem(r.error);
    const incoming = r.words.map((w): ModuleRow => ({ ...w, status: "new", count: 0 }));
    setWords((ws) => [...ws, ...incoming.filter((n) => !ws.some((w) => w.id === n.id))]);
    setPasting("");
    showToast(`Added ${incoming.length} ${incoming.length === 1 ? "word" : "words"}`);
  }

  async function makePublic() {
    setBusy(true);
    setProblem("");
    const ok = await actions.makeModulePublic(moduleId).catch(() => false);
    setBusy(false);
    if (ok) {
      setIsPublic(true);
      setSheet(null);
      router.refresh();
    } else setProblem("Couldn't make this Pack public. Please try again.");
  }

  let removeWarning: string;
  let removeLabel: string;
  if (isOwner && !isPublic) {
    removeLabel = "Delete forever";
    removeWarning = "This permanently deletes the Pack. The words stay in the shared dictionary.";
  } else if (isOwner) {
    removeLabel = "Archive";
    removeWarning = "Public Packs can't be deleted. Archiving hides it from the list and removes it from yours, but people who already added it keep it.";
  } else {
    removeLabel = "Remove";
    removeWarning = "This only removes it from your list. The Pack itself isn't deleted.";
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-[8rem] flex-1 flex-col gap-0.5">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted">
            {words.length} {words.length === 1 ? "word" : "words"} · {by}
            {archived ? " · Archived" : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
        {(isOwner || added) && (
          <EditButton
            removeLabel="Remove Pack"
            onRemove={() => {
              setProblem("");
              setSheet({ kind: "remove-module" });
            }}
            visibility={isOwner ? { isPublic, onMakePublic: () => { setProblem(""); setSheet({ kind: "public" }); } } : undefined}
          />
        )}
        <CloseButton fallbackHref="/vocabulary" />
        </div>
      </header>

      {editMode && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3">
          <button
            type="button"
            onClick={() => {
              setDraft(title);
              setProblem("");
              setSheet({ kind: "rename" });
            }}
            className="self-start rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
          >
            ✎ Rename
          </button>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">Add more words</span>
            <textarea
              rows={3}
              lang="he"
              dir="rtl"
              value={pasting}
              onChange={(e) => setPasting(e.target.value)}
              placeholder="Paste Hebrew words, one per line"
              className="hebrew w-full rounded-xl border border-border bg-background px-3 py-2 text-lg outline-none focus:border-accent"
            />
          </label>
          {!sheet && problem && <p className="text-sm text-danger">{problem}</p>}
          <button
            type="button"
            onClick={addWords}
            disabled={busy || !pasting.trim()}
            className="h-10 rounded-xl border border-accent font-semibold text-accent hover:bg-accent/10 disabled:opacity-50"
          >
            {busy && !sheet ? "Looking up the words…" : "Add words"}
          </button>
        </div>
      )}

      {added && words.length > 0 && (
        <p className="flex items-center gap-3 text-sm text-muted">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <span className="block h-full bg-success" style={{ width: `${Math.round((learned / words.length) * 100)}%` }} />
          </span>
          {learned} of {words.length} learned
        </p>
      )}

      {words.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">This Pack has no words yet.</p>
      ) : (
        <ul className="grid gap-2">
          {words.map((w) => {
            const meta = [w.partOfSpeech, genderLabel(w.gender, w.plural)].filter(Boolean).join(" · ");
            const body = (
              <>
                <div className="flex min-w-0 flex-col items-start gap-1 text-left">
                  <span>{w.english}</span>
                  {meta && <span className="text-xs text-muted">{meta}</span>}
                  {added && <StatusBadge status={w.status} count={w.count} learnAfter={learnAfter} />}
                </div>
                <div className="shrink-0 text-right">
                  <span lang="he" className="hebrew block text-2xl text-accent">
                    {hebrewText(w.lemma, w.vocalized, showNikud)}
                  </span>
                  {showTranslit && w.transliteration && <span className="block text-sm italic text-muted">{w.transliteration}</span>}
                </div>
              </>
            );
            const box = "flex min-w-0 flex-1 items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3";
            return (
              <li
                key={w.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(w.id, el);
                  else itemRefs.current.delete(w.id);
                }}
                className={`flex items-stretch gap-2 ${dragId === w.id ? "relative z-10 rounded-xl ring-2 ring-accent" : ""}`}
              >
                {editMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setProblem("");
                      setSheet({ kind: "remove-word", word: w });
                    }}
                    aria-label={`Remove ${w.lemma} from this Pack`}
                    className="w-10 shrink-0 rounded-xl border border-border text-lg text-danger hover:bg-surface-2"
                  >
                    ✕
                  </button>
                )}
                {added && !editMode ? (
                  <Link href={`/dictionary/${w.id}`} className={`${box} hover:bg-surface-2`}>
                    {body}
                  </Link>
                ) : (
                  <div className={box}>{body}</div>
                )}
                {editMode && (
                  <button
                    type="button"
                    aria-label={`Move ${w.lemma}. Drag, or use the up and down arrow keys`}
                    onPointerDown={(e) => onHandleDown(e, w.id)}
                    onKeyDown={(e) => onHandleKey(e, w.id)}
                    className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl border border-border text-muted hover:bg-surface-2 active:cursor-grabbing"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <circle cx="9" cy="6" r="1.6" />
                      <circle cx="15" cy="6" r="1.6" />
                      <circle cx="9" cy="12" r="1.6" />
                      <circle cx="15" cy="12" r="1.6" />
                      <circle cx="9" cy="18" r="1.6" />
                      <circle cx="15" cy="18" r="1.6" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!editMode && words.length > 0 && (
        <div className={`sticky ${inOverlay ? "bottom-4" : "bottom-24"} flex flex-col gap-2 pt-1`}>
          {added ? (
            <>
              <Link
                href={`/flashcards?module=${moduleId}`}
                className="flex h-12 items-center justify-center rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong"
              >
                {toLearn > 0 ? `Start flashcards (${toLearn} to learn)` : "All learned. Review the cards"}
              </Link>
              {toLearn > 0 && learned > 0 && (
                <Link href={`/flashcards?module=${moduleId}&scope=all`} className="text-center text-xs text-muted underline underline-offset-2 hover:text-foreground">
                  Review all {words.length} words
                </Link>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="h-12 rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong disabled:opacity-60"
            >
              {busy ? "Adding…" : `Add Pack (${words.length} ${words.length === 1 ? "word" : "words"})`}
            </button>
          )}
          {problem && !sheet && <p className="text-center text-sm text-danger">{problem}</p>}
        </div>
      )}

      {sheet?.kind === "rename" && (
        <Sheet title="Rename Pack" onClose={() => !busy && setSheet(null)}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={120} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-accent" />
          {problem && <p className="text-sm text-danger">{problem}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => setSheet(null)} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
              Cancel
            </button>
            <button type="button" disabled={busy || !draft.trim()} onClick={rename} className="h-11 flex-1 rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong disabled:opacity-60">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.kind === "remove-word" && (
        <Sheet title="Remove from this Pack?" onClose={() => !busy && setSheet(null)}>
          <p className="text-sm">
            Remove <span lang="he" className="hebrew text-base text-accent">{sheet.word.lemma}</span> from this Pack? The word stays in the shared dictionary, and in your Dictionary if it comes from a song or another module.
          </p>
          {problem && <p className="text-sm text-danger">{problem}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => setSheet(null)} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
              Cancel
            </button>
            <button type="button" disabled={busy} onClick={() => removeWord(sheet.word)} className="h-11 flex-1 rounded-xl bg-danger font-semibold text-accent-contrast disabled:opacity-60">
              {busy ? "Working…" : "Remove word"}
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.kind === "public" && (
        <Sheet title="Make this Pack public?" onClose={() => !busy && setSheet(null)}>
          <p className="text-sm">
            Everyone using milim will be able to find this Pack and add it. <strong>This can&apos;t be undone.</strong>
          </p>
          {problem && <p className="text-sm text-danger">{problem}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => setSheet(null)} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
              Cancel
            </button>
            <button type="button" disabled={busy} onClick={makePublic} className="h-11 flex-1 rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong disabled:opacity-60">
              {busy ? "Working…" : "Make public"}
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.kind === "remove-module" && (
        <Sheet title="Remove this Pack?" onClose={() => !pending && setSheet(null)}>
          <p className="text-sm">{removeWarning}</p>
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={() => setSheet(null)} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => actions.removeModule(moduleId))}
              className="h-11 flex-1 rounded-xl bg-danger font-semibold text-accent-contrast disabled:opacity-60"
            >
              {pending ? "Working…" : removeLabel}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
