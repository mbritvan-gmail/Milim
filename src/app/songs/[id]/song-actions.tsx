"use client";

import { useState, useTransition } from "react";
import { removeSong } from "./actions";

type Props = { songId: string; isOwner: boolean; isPublic: boolean };

export function SongActions({ songId, isOwner, isPublic }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  let label: string;
  let warning: string;
  let confirmLabel: string;
  if (isOwner && !isPublic) {
    label = "Delete song";
    confirmLabel = "Delete forever";
    warning = "This permanently deletes the song, its translations and its key words.";
  } else if (isOwner) {
    label = "Archive song";
    confirmLabel = "Archive";
    warning =
      "Public songs can't be deleted. Archiving hides it from the public library and removes it from your list, but people who already added it keep it.";
  } else {
    label = "Remove from my songs";
    confirmLabel = "Remove";
    warning = "This only removes it from your list. The song itself isn't deleted.";
  }

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-6">
      {confirming ? (
        <div className="flex flex-col gap-3 rounded-xl border border-danger/40 bg-surface p-4">
          <p className="text-sm">{warning}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => removeSong(songId))}
              className="h-10 flex-1 rounded-xl bg-danger font-semibold text-accent-contrast disabled:opacity-60"
            >
              {pending ? "Working…" : confirmLabel}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="h-10 flex-1 rounded-xl border border-border hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start text-sm text-muted underline underline-offset-4 hover:text-danger"
        >
          {label}
        </button>
      )}
    </section>
  );
}
