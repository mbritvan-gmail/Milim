"use client";

import Link from "next/link";
import { useState } from "react";
import { Sheet } from "@/components/sheet";

export type PickOption = { id: string; title: string; total: number; unlearned: number };
type Kind = "song" | "pack";

const chevron = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const note = (o: PickOption) => (o.unlearned > 0 ? `${o.unlearned} to learn` : "all learned");

// "Or practise words from": pick one Song or one Word Pack and its flash cards start right away.
export function StudyPicker({ songs, packs }: { songs: PickOption[]; packs: PickOption[] }) {
  const [open, setOpen] = useState<Kind | null>(null);

  const row = "flex h-14 w-full items-center justify-between rounded-xl border border-border bg-surface px-4 text-left font-medium hover:bg-surface-2";
  const options = open === "song" ? songs : packs;
  // Words still to learn first; if everything is learned, a review of all of them.
  const hrefFor = (kind: Kind, o: PickOption) => `/study?${kind === "song" ? "song" : "module"}=${o.id}&scope=${o.unlearned > 0 ? "unlearned" : "all"}`;

  return (
    <section className="flex flex-col gap-2" aria-label="Practise words from a Song or a Word Pack">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Or practise words from</h2>
      {songs.length > 0 && (
        <button type="button" onClick={() => setOpen("song")} className={row}>
          <span>A Song</span>
          <span className="text-muted">{chevron}</span>
        </button>
      )}
      {packs.length > 0 && (
        <button type="button" onClick={() => setOpen("pack")} className={row}>
          <span>A Word Pack</span>
          <span className="text-muted">{chevron}</span>
        </button>
      )}

      {open && (
        <Sheet title={open === "song" ? "Pick a Song" : "Pick a Word Pack"} onClose={() => setOpen(null)}>
          <ul className="flex flex-col gap-2">
            {options.map((o) => (
              <li key={o.id}>
                <Link
                  href={hrefFor(open, o)}
                  onClick={() => setOpen(null)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2 text-left hover:bg-surface-2"
                >
                  <span className="min-w-0 font-medium">{o.title}</span>
                  <span className="shrink-0 text-sm text-muted">{note(o)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </section>
  );
}
