"use client";

import { useState } from "react";
import { saveSettings, type SettingsChange } from "./actions";
import type { Direction } from "@/lib/study";

const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: "he-en", label: "Hebrew → English" },
  { id: "en-he", label: "English → Hebrew" },
  { id: "mixed", label: "Mixed" },
];

function Segment<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${value === o.id ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:bg-surface-2"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsForm({
  initialLearnAfter,
  initialDirection,
  initialShowTranslit,
  email,
}: {
  initialLearnAfter: number;
  initialDirection: Direction;
  initialShowTranslit: boolean;
  email: string;
}) {
  const [learnAfter, setLearnAfter] = useState(initialLearnAfter);
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [showTranslit, setShowTranslit] = useState(initialShowTranslit);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Each change saves straight away; if saving fails the control goes back to what it was.
  async function change(change: SettingsChange, revert: () => void) {
    setMessage(null);
    const error = await saveSettings(change).catch(() => "Couldn't save that. Please try again.");
    if (error) {
      revert();
      setMessage({ kind: "error", text: error });
    } else {
      setMessage({ kind: "ok", text: "Saved" });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Learning</h2>
        <div className="flex flex-col gap-2">
          <p className="font-medium">Correct answers to learn a word</p>
          <Segment
            label="Correct answers to learn a word"
            options={[1, 2, 3].map((n) => ({ id: n, label: String(n) }))}
            value={learnAfter}
            onChange={(n) => {
              const before = learnAfter;
              setLearnAfter(n);
              void change({ learnAfter: n }, () => setLearnAfter(before));
            }}
          />
          <p className="text-xs text-muted">
            Quiz and flashcard answers both count. A word you miss after learning it goes back to Learning.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium">Study direction</p>
          <Segment
            label="Study direction"
            options={DIRECTIONS}
            value={direction}
            onChange={(d) => {
              const before = direction;
              setDirection(d);
              void change({ direction: d }, () => setDirection(before));
            }}
          />
          <p className="text-xs text-muted">You can still switch it during a session.</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Display</h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Show pronunciation</p>
            <p className="text-xs text-muted">
              The English spelling of Hebrew words, shown on song pages, in lists and on the back of cards. It never shows on
              the front of a Hebrew card.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showTranslit}
            aria-label="Show pronunciation"
            onClick={() => {
              const next = !showTranslit;
              setShowTranslit(next);
              void change({ showTranslit: next }, () => setShowTranslit(!next));
            }}
            className={`h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${showTranslit ? "bg-accent" : "bg-border"}`}
          >
            <span className={`block h-6 w-6 rounded-full bg-background transition-transform ${showTranslit ? "translate-x-5" : ""}`} />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Account</h2>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-medium">{email}</p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-surface-2">
              Sign out
            </button>
          </form>
        </div>
      </section>

      <p
        role="status"
        className={`h-5 text-center text-sm ${message?.kind === "error" ? "text-danger" : "text-success"}`}
      >
        {message?.text ?? ""}
      </p>
    </div>
  );
}
