"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { makeSongPublic } from "./actions";

type Props = { songId: string; isOwner: boolean; isPublic: boolean };

export function SongActions({ songId, isOwner, isPublic }: Props) {
  const router = useRouter();
  const [confirmingPublic, setConfirmingPublic] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [problem, setProblem] = useState("");

  // Only the owner of a private song has anything here: sharing it publicly.
  if (!(isOwner && !isPublic)) return null;

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
    </section>
  );
}
