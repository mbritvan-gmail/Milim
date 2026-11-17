"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { makeSongPublic, removeSong } from "./actions";
import { EditButton } from "@/components/edit-mode";
import { Sheet } from "@/components/sheet";

// Edit / Done plus "Remove song" at the top of a song, so nothing needs scrolling to the bottom.
export function SongHeaderControls({ songId, isOwner, isPublic, canRemove }: { songId: string; isOwner: boolean; isPublic: boolean; canRemove: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmingPublic, setConfirmingPublic] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [problem, setProblem] = useState("");
  const [pending, startTransition] = useTransition();

  async function publish() {
    setPublishing(true);
    setProblem("");
    const ok = await makeSongPublic(songId).catch(() => false);
    if (ok) {
      setConfirmingPublic(false);
      router.refresh();
    } else {
      setProblem("Couldn't make this song public. Please try again.");
    }
    setPublishing(false);
  }

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
      <EditButton
        onRemove={canRemove ? () => setConfirming(true) : undefined}
        visibility={isOwner ? { isPublic, onMakePublic: () => setConfirmingPublic(true) } : undefined}
      />
      {confirmingPublic && (
        <Sheet title="Make this song public?" onClose={() => !publishing && setConfirmingPublic(false)}>
          <p className="text-sm">
            Everyone using milim will be able to find this song and add it. <strong>This can&apos;t be undone.</strong>
          </p>
          {problem && <p className="text-sm text-danger">{problem}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={publishing} onClick={() => setConfirmingPublic(false)} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
              Cancel
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={publish}
              className="h-11 flex-1 rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong disabled:opacity-60"
            >
              {publishing ? "Working…" : "Make public"}
            </button>
          </div>
        </Sheet>
      )}
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
