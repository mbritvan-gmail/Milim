"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { makeSongPublic, removeSong } from "./actions";

type Props = { songId: string; isOwner: boolean; isPublic: boolean; inMyList: boolean };

export function SongActions({ songId, isOwner, isPublic, inMyList }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmingPublic, setConfirmingPublic] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [problem, setProblem] = useState("");
  const [pending, startTransition] = useTransition();

  // A song that isn't in your list has nothing to remove (the "Add" button covers it).
  if (!isOwner && !inMyList) return null;

  async function publish() {
    setPublishing(true);
    setProblem("");
    const ok = await makeSongPublic(songId).catch(() => false);
    if (ok) {
      router.refresh();
    } else {
      setPublishing(false);
      setProblem("Couldn't make this song public. Please try again.");
    }
  }

  let label: string;
  let warning: string;
  let confirmLabel: string;
  if (isOwner && !isPublic) {
    label = "Delete song";
    confirmLabel = "Delete forever";
    warning = "This permanently deletes the song, its translations and its vocabulary.";
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
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      {isOwner && !isPublic && (
        <div className="flex flex-col gap-3">
          {confirmingPublic ? (
            <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-surface p-4">
              <p className="text-sm">
                Everyone using milim will be able to find this song and add it. <strong>This can&apos;t be undone.</strong>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={publishing}
                  onClick={publish}
                  className="h-10 flex-1 rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong disabled:opacity-60"
                >
                  {publishing ? "Working…" : "Make public"}
                </button>
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => setConfirmingPublic(false)}
                  className="h-10 flex-1 rounded-xl border border-border hover:bg-surface-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingPublic(true)}
              className="self-start rounded-full border border-border px-4 py-2 text-sm hover:bg-surface-2"
            >
              Share in the public library
            </button>
          )}
          {problem && <p className="text-sm text-danger">{problem}</p>}
        </div>
      )}
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
