"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditMode } from "@/components/edit-mode";
import { claimTodaysAttempt } from "@/lib/nikud-catchup";
import type { EditActions } from "@/lib/editing";

// Shown nowhere: when the owner opens a song that is missing nikud, quietly asks for it once (the server
// tries up to three times within 45 seconds) and refreshes the page if anything was added. At most one
// attempt per song per day on this device; any failure is silent.
export function NikudCatchUp({ songId, addNikud }: { songId: string; addNikud: EditActions["addNikud"] }) {
  const router = useRouter();
  const { editing } = useEditMode();
  const editingRef = useRef(editing);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let store: Storage | null = null;
    try {
      store = window.localStorage;
    } catch {
      store = null;
    }
    if (!claimTodaysAttempt(store, songId, new Date())) return;
    addNikud(songId)
      .then((result) => {
        // Don't redraw the page under someone who has started editing; they'll see it next time.
        if (result.ok && !editingRef.current) router.refresh();
      })
      .catch(() => {});
  }, [songId, addNikud, router]);

  return null;
}
