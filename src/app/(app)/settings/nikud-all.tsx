"use client";

import { useState } from "react";
import { addNikud } from "../songs/[id]/edit-actions";
import { songsNeedingNikud } from "./nikud-actions";

type Report = { songs: number; lines: number; words: number; skipped: number; failed: { title: string; reason: string }[]; input: number; output: number };

// Adds nikud to every song you own that is missing it, one song at a time, and reports the Claude tokens used.
export function NikudAll() {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setState("running");
    setError("");
    setReport(null);
    const list = await songsNeedingNikud().catch(() => ({ ok: false as const, error: "Couldn't load your songs." }));
    if (!list.ok) {
      setError(list.error);
      setState("idle");
      return;
    }
    const total: Report = { songs: 0, lines: 0, words: 0, skipped: 0, failed: [], input: 0, output: 0 };
    for (let i = 0; i < list.songs.length; i++) {
      const song = list.songs[i];
      setProgress(`Song ${i + 1} of ${list.songs.length}: ${song.title}`);
      const r = await addNikud(song.id).catch(() => null);
      const used = (r as { usage?: { input: number; output: number } } | null)?.usage;
      total.input += used?.input ?? 0;
      total.output += used?.output ?? 0;
      if (r && r.ok) {
        total.songs++;
        total.lines += r.lines.length;
        total.words += r.words.length;
        total.skipped += r.skipped;
      } else {
        total.failed.push({ title: song.title, reason: r && !r.ok ? r.error : "The request didn't finish." });
      }
    }
    setReport(total);
    setProgress("");
    setState("done");
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Nikud</h2>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">Add nikud to all my songs</p>
          <p className="text-xs text-muted">Goes through the songs you added that are missing nikud, one at a time. This uses Claude, so it costs a little. Keep this page open until it finishes.</p>
        </div>
        <button type="button" onClick={run} disabled={state === "running"} className="shrink-0 rounded-xl border border-border px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-60">
          {state === "running" ? "Working…" : "Run"}
        </button>
      </div>
      {progress && <p role="status" className="text-sm text-muted">{progress}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {report && (
        <p role="status" className="text-sm">
          {report.songs === 0 && report.failed.length === 0
            ? "All your songs already have nikud."
            : `Done: ${report.songs} ${report.songs === 1 ? "song" : "songs"}, ${report.lines} lines and ${report.words} words. Claude used ${report.input.toLocaleString()} input and ${report.output.toLocaleString()} output tokens.`}
          {report.skipped > 0 && ` ${report.skipped} couldn't be done; run it again to retry.`}
        </p>
      )}
      {report && report.failed.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-danger">
          {report.failed.map((f) => (
            <li key={f.title}>
              {f.title}: {f.reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
