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
import { CatalogSearch, Cover, PlayerLinks } from "@/components/song-links";
import { Sheet } from "@/components/sheet";
import { SECTION_KINDS, sectionLabel } from "@/lib/sections";

const input = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-accent";
const label = "text-sm font-medium text-muted";

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

export function LineSheet({ line, onSave, onClose, onAddSection }: { line: LineFields; onSave: (f: LineFields) => Promise<string | null>; onClose: () => void; onAddSection?: () => void }) {
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
      {onAddSection && (
        <button type="button" onClick={onAddSection} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-semibold text-accent hover:bg-surface-2">
          <span aria-hidden="true">+</span> Add section above this line
        </button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Buttons busy={busy} saveLabel="Save" onSave={save} onClose={onClose} />
    </Sheet>
  );
}

// Pick a name (and a number) for a section header: used both to add a new one and to rename one.
export function SectionSheet({
  title,
  saveLabel,
  initialKind,
  initialNumber,
  onSave,
  onClose,
}: {
  title: string;
  saveLabel: string;
  initialKind: string | null;
  initialNumber: number;
  onSave: (label: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<string | null>(initialKind);
  const [number, setNumber] = useState(initialNumber);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (!kind) return;
    setBusy(true);
    setError("");
    const err = await onSave(sectionLabel(kind, number));
    setBusy(false);
    if (err) setError(err);
  }
  return (
    <Sheet title={title} onClose={onClose}>
      <div role="group" aria-label="Section name" className="flex flex-wrap gap-2">
        {SECTION_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              setNumber(k === "Verse" ? number || 1 : 0);
            }}
            className={`h-11 rounded-full border px-3.5 text-sm font-semibold ${kind === k ? "border-accent bg-accent text-accent-contrast" : "border-border hover:bg-surface-2"}`}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">Number (for verses)</span>
        <span className="flex items-center gap-1.5">
          <button type="button" aria-label="Lower number" onClick={() => setNumber((n) => Math.max(0, n - 1))} className="h-11 w-11 rounded-xl border border-border text-xl hover:bg-surface-2">
            -
          </button>
          <span className="min-w-7 text-center text-lg font-bold">{number || "-"}</span>
          <button type="button" aria-label="Raise number" onClick={() => setNumber((n) => Math.min(9, n + 1))} className="h-11 w-11 rounded-xl border border-border text-xl hover:bg-surface-2">
            +
          </button>
        </span>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Buttons busy={busy} saveLabel={saveLabel} onSave={save} onClose={onClose} disabled={!kind} />
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
    <Sheet title="Title, artist & links" onClose={onClose}>
      {d.coverUrl || d.album ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-2.5">
          <Cover url={d.coverUrl || null} size={56} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{d.title}</span>
            <span className="truncate text-xs text-muted">{[d.artist, d.album].filter(Boolean).join(" · ")}</span>
          </div>
          <button type="button" onClick={() => setD({ ...d, coverUrl: "", album: "" })} className="shrink-0 px-1 text-sm font-semibold text-accent">
            Change
          </button>
        </div>
      ) : (
        <CatalogSearch onPick={(m) => setD({ ...d, title: m.title, artist: m.artist, album: m.album, coverUrl: m.coverUrl ?? "" })} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={label}>Title</span>
          <input maxLength={MAX_TITLE} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Artist</span>
          <input maxLength={MAX_TITLE} value={d.artist} onChange={(e) => setD({ ...d, artist: e.target.value })} className={input} />
        </label>
      </div>
      <PlayerLinks
        title={d.title}
        artist={d.artist}
        spotifyUrl={d.spotifyUrl}
        youtubeUrl={d.youtubeUrl}
        onChange={(l) => setD({ ...d, spotifyUrl: l.spotifyUrl, youtubeUrl: l.youtubeUrl })}
      />
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
