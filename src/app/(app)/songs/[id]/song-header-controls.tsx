"use client";

import { useState, useTransition } from "react";
import { removeSong } from "./actions";
import { EditButton } from "./edit-mode";
import { Sheet } from "./edit-sheets";

// Edit / Done plus "Remove song" at the top of a song, so nothing needs scrolling to the bottom.
export function SongHeaderControls({ songId, isOwner, isPublic, canRemove }: { songId: string; isOwner: boolean; isPublic: boolean; canRemove: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  let warning: string;
  let confirmLabel: string;
  if (isOwner && !isPublic) {
    confirmLabel = "Delete forever";
    warning = "This permanently deletes the song, its translations and its vocabulary.";
  } else if (isOwner) {
    confirmLabel = "Archive";
    warning =
      "Public songs can't be deleted. Archiving hides it from the public library and removes it from your list, but people who already added it keep it.";
  } else {
    confirmLabel = "Remove";
    warning = "This only removes it from your list. The song itself isn't deleted.";
  }

  return (
    <>
      <EditButton onRemove={canRemove ? () => setConfirming(true) : undefined} />
      {confirming && (
        <Sheet title="Remove this song?" onClose={() => !pending && setConfirming(false)}>
          <p className="text-sm">{warning}</p>
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => removeSong(songId))}
              className="h-11 flex-1 rounded-xl bg-danger font-semibold text-accent-contrast disabled:opacity-60"
            >
              {pending ? "Working…" : confirmLabel}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
