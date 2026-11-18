"use client";

import Link from "next/link";
import { useState } from "react";
import { Sheet } from "@/components/sheet";

export type PickOption = { id: string; title: string; total: number; unlearned: number };
type Kind = "song" | "pack";
type Picked = { kind: Kind; option: PickOption };

const chevron = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const note = (o: PickOption) => (o.unlearned > 0 ? `${o.unlearned} to learn` : "all learned");

// "Or practise words from": choose one Song or one Word Pack, then start studying it.
export function StudyPicker({ songs, packs }: { songs: PickOption[]; packs: PickOption[] }) {
  const [open, setOpen] = useState<Kind | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);

  const row = "flex h-14 w-full items-center justify-between rounded-xl border border-border bg-surface px-4 text-left font-medium hover:bg-surface-2";
  const options = open === "song" ? songs : packs;

  const href = picked
    ? picked.kind === "song"
      ? `/study?song=${picked.option.id}&scope=${picked.option.unlearned > 0 ? "unlearned" : "all"}`
      : `/study?module=${picked.option.id}&scope=${picked.option.unlearned > 0 ? "unlearned" : "all"}`
    : "";
  const count = picked ? (picked.option.unlearned > 0 ? picked.option.unlearned : picked.option.total) : 0;

  return (
    <section className="flex flex-col gap-2" aria-label="Practise words from a Song or a Word Pack">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Or practise words from</h2>
      {songs.length > 0 && (
        <button type="button" onClick={() => setOpen("song")} className={row}>
          <span>A Song</span>
          <span className="flex min-w-0 items-center gap-1.5 text-muted">
            <span className="truncate">{picked?.kind === "song" ? picked.option.title : ""}</span>
            {chevron}
          </span>
        </button>
      )}
      {packs.length > 0 && (
        <button type="button" onClick={() => setOpen("pack")} className={row}>
          <span>A Word Pack</span>
          <span className="flex min-w-0 items-center gap-1.5 text-muted">
            <span className="truncate">{picked?.kind === "pack" ? picked.option.title : ""}</span>
            {chevron}
          </span>
        </button>
      )}
      {picked && (
        <Link href={href} className="mt-1 flex min-h-[52px] items-center justify-center rounded-xl bg-accent px-4 text-center font-bold text-accent-contrast hover:bg-accent-strong">
          {picked.option.unlearned > 0 ? "Study" : "Review"} {count} {count === 1 ? "word" : "words"} from {picked.option.title}
        </Link>
      )}

      {open && (
        <Sheet title={open === "song" ? "Pick a Song" : "Pick a Word Pack"} onClose={() => setOpen(null)}>
          <ul className="flex flex-col gap-2">
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked({ kind: open, option: o });
                    setOpen(null);
                  }}
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2 text-left hover:bg-surface-2"
                >
                  <span className="min-w-0 font-medium">{o.title}</span>
                  <span className="shrink-0 text-sm text-muted">{note(o)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </section>
  );
}
