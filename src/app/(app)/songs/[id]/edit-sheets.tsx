"use client";

import { useEffect, useState } from "react";
import {
  MAX_ENGLISH,
  MAX_HEBREW,
  MAX_NOTE,
  MAX_TITLE,
  MAX_TRANSLIT,
  type LineFields,
  type SongDetails,
  type VocabDraft,
} from "@/lib/editing";
import { MediaFinder } from "./media-finder";

const input = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-accent";
const label = "text-sm font-medium text-muted";

// A panel that slides up from the bottom of the screen.
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-2xl border border-border bg-surface p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full text-xl text-muted hover:bg-surface-2">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Buttons({ busy, saveLabel, onSave, onClose, disabled }: { busy: boolean; saveLabel: string; onSave: () => void; onClose: () => void; disabled?: boolean }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={busy || disabled}
        className="h-11 flex-1 rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong disabled:opacity-60"
      >
        {busy ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}

export function LineSheet({ line, onSave, onClose }: { line: LineFields; onSave: (f: LineFields) => Promise<string | null>; onClose: () => void }) {
  const [f, setF] = useState(line);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    const err = await onSave(f);
    setBusy(false);
    if (err) setError(err);
  }
  return (
    <Sheet title="Edit line" onClose={onClose}>
      <label className="flex flex-col gap-1">
        <span className={label}>English</span>
        <textarea rows={2} maxLength={MAX_ENGLISH} value={f.english} onChange={(e) => setF({ ...f, english: e.target.value })} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Pronunciation</span>
        <input maxLength={MAX_TRANSLIT} value={f.transliteration} onChange={(e) => setF({ ...f, transliteration: e.target.value })} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Hebrew (fix typos only)</span>
        <input lang="he" dir="rtl" maxLength={MAX_HEBREW} value={f.hebrew} onChange={(e) => setF({ ...f, hebrew: e.target.value })} className={`${input} hebrew text-xl`} />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Buttons busy={busy} saveLabel="Save" onSave={save} onClose={onClose} />
    </Sheet>
  );
}

// Add a tapped word to the Song Vocabulary; Claude fills in the fields and the person can adjust them.
export function AddWordSheet({
  token,
  suggest,
  onAdd,
  onClose,
}: {
  token: string;
  suggest: () => Promise<{ draft: VocabDraft } | { error: string }>;
  onAdd: (d: VocabDraft) => Promise<string | null>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<VocabDraft | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    suggest().then((r) => {
      if (cancelled) return;
      if ("error" in r) setLoadError(r.error);
      else setDraft(r.draft);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    if (!draft) return;
    setBusy(true);
    setError("");
    const err = await onAdd(draft);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Sheet title="Add to Song Vocabulary" onClose={onClose}>
      <p lang="he" className="hebrew text-2xl text-accent">
        {token}
      </p>
      {!draft && !loadError && <p className="text-sm text-muted">Looking up this word…</p>}
      {loadError && <p className="text-sm text-danger">{loadError}</p>}
      {draft && (
        <>
          <p className="text-xs text-muted">Filled in for you. Change anything that looks off.</p>
          <label className="flex flex-col gap-1">
            <span className={label}>Hebrew (dictionary form)</span>
            <input lang="he" dir="rtl" value={draft.lemma} onChange={(e) => setDraft({ ...draft, lemma: e.target.value })} className={`${input} hebrew text-xl`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Pronunciation</span>
            <input value={draft.transliteration} onChange={(e) => setDraft({ ...draft, transliteration: e.target.value })} className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>English</span>
            <input value={draft.english} onChange={(e) => setDraft({ ...draft, english: e.target.value })} className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Part of speech</span>
            <input value={draft.partOfSpeech} onChange={(e) => setDraft({ ...draft, partOfSpeech: e.target.value })} className={input} />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Buttons busy={busy} saveLabel="Add word" onSave={add} onClose={onClose} disabled={!draft.lemma.trim() || !draft.english.trim()} />
        </>
      )}
      {loadError && (
        <button type="button" onClick={onClose} className="h-11 rounded-xl border border-border hover:bg-surface-2">
          Close
        </button>
      )}
    </Sheet>
  );
}

export function RemoveWordSheet({ word, onConfirm, onClose }: { word: string; onConfirm: () => Promise<string | null>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true);
    const err = await onConfirm();
    setBusy(false);
    if (err) setError(err);
  }
  return (
    <Sheet title="Remove from Song Vocabulary?" onClose={onClose}>
      <p className="text-sm">
        Remove <span lang="he" className="hebrew text-base text-accent">{word}</span> from this song&apos;s Song Vocabulary? The lyrics stay exactly as they are. The word stays in
        your Dictionary if another song&apos;s vocabulary has it.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Buttons busy={busy} saveLabel="Remove word" onSave={go} onClose={onClose} />
    </Sheet>
  );
}

export function DetailsSheet({ details, onSave, onClose }: { details: SongDetails; onSave: (d: SongDetails) => Promise<string | null>; onClose: () => void }) {
  const [d, setD] = useState(details);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    const err = await onSave(d);
    setBusy(false);
    if (err) setError(err);
  }
  return (
    <Sheet title="Song details" onClose={onClose}>
      <label className="flex flex-col gap-1">
        <span className={label}>Title</span>
        <input maxLength={MAX_TITLE} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Artist</span>
        <input maxLength={MAX_TITLE} value={d.artist} onChange={(e) => setD({ ...d, artist: e.target.value })} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Spotify or YouTube link</span>
        <input value={d.mediaUrl} onChange={(e) => setD({ ...d, mediaUrl: e.target.value })} placeholder="https://…" className={input} />
      </label>
      <MediaFinder title={d.title} artist={d.artist} onPick={(url) => setD({ ...d, mediaUrl: url })} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Buttons busy={busy} saveLabel="Save" onSave={save} onClose={onClose} disabled={!d.title.trim()} />
    </Sheet>
  );
}

export function SuggestSheet({ hebrew, current, onSend, onClose }: { hebrew: string; current: string; onSend: (text: string, note: string) => Promise<string | null>; onClose: () => void }) {
  const [text, setText] = useState(current);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send() {
    setBusy(true);
    setError("");
    const err = await onSend(text, note);
    setBusy(false);
    if (err) setError(err);
  }
  return (
    <Sheet title="Suggest a change" onClose={onClose}>
      <p lang="he" className="hebrew text-xl">
        {hebrew}
      </p>
      <label className="flex flex-col gap-1">
        <span className={label}>Better English</span>
        <textarea rows={2} maxLength={MAX_ENGLISH} value={text} onChange={(e) => setText(e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Note for the owner (optional)</span>
        <input maxLength={MAX_NOTE} value={note} onChange={(e) => setNote(e.target.value)} className={input} />
      </label>
      <p className="text-xs text-muted">The song&apos;s owner will review your suggestion. Nothing changes until they approve it.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Buttons busy={busy} saveLabel="Send suggestion" onSave={send} onClose={onClose} disabled={!text.trim()} />
    </Sheet>
  );
}
