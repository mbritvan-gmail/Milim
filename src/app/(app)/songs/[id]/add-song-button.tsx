"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addSong } from "./actions";

// Shown on a song you can see but haven't added to your list yet.
export function AddSongButton({ songId }: { songId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function add() {
    setBusy(true);
    setProblem("");
    const ok = await addSong(songId).catch(() => false);
    if (ok) router.refresh();
    else {
      setBusy(false);
      setProblem("Couldn't add this song. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-accent/40 bg-surface p-4">
      <p className="text-sm text-muted">Add this song to your list to quiz yourself and collect its words in your dictionary.</p>
      <button
        type="button"
        onClick={add}
        disabled={busy}
        className="h-11 rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong disabled:opacity-60"
      >
        {busy ? "Adding…" : "+ Add to my songs"}
      </button>
      {problem && <p className="text-sm text-danger">{problem}</p>}
    </div>
  );
}
