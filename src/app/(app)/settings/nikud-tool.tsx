"use client";

// TEMPORARY: see nikud-tool-actions.ts for what to delete when every song has nikud.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addNikudToSong, type NikudToolSong } from "./nikud-tool-actions";

type Phase = "idle" | "running" | "done";

export function NikudTool({ total, missing }: { total: number; missing: NikudToolSong[] }) {
  const router = useRouter();
  const [queue, setQueue] = useState<NikudToolSong[]>(missing);
  const [phase, setPhase] = useState<Phase>("idle");
  const [position, setPosition] = useState(0);
  const [current, setCurrent] = useState("");
  const [fixed, setFixed] = useState(0);
  const [failed, setFailed] = useState<NikudToolSong[]>([]);
  const stopRequested = useRef(false);

  async function run(list: NikudToolSong[]) {
    stopRequested.current = false;
    setPhase("running");
    setFixed(0);
    setFailed([]);
    let ok = 0;
    const bad: NikudToolSong[] = [];
    let i = 0;
    for (; i < list.length; i++) {
      if (stopRequested.current) break;
      setPosition(i);
      setCurrent(list[i].title);
      const result = await addNikudToSong(list[i].id).catch(() => ({ ok: false as const, error: "" }));
      // A song with a few lines Claude couldn't do still counts as needing another go.
      if (result.ok && result.skipped === 0) ok++;
      else bad.push(list[i]);
    }
    const untouched = list.slice(i);
    setFixed(ok);
    setFailed(bad);
    setQueue([...bad, ...untouched]);
    setPhase(untouched.length > 0 ? "idle" : "done");
    router.refresh();
  }

  const n = queue.length;
  const pct = phase === "running" && n > 0 ? Math.round((position / n) * 100) : 0;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Temporary tool</h2>
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">only you see this</span>
      </div>
      <div>
        <p className="font-semibold">Add nikud to all songs</p>
        <p className="mt-1 text-sm text-muted">
          Goes through every song in milim, whoever added it, and fills in nikud wherever it is missing. Songs that already have nikud are skipped. Costs a few cents in total.
        </p>
      </div>

      {phase === "idle" && (
        <>
          <p className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
            {total} {total === 1 ? "song" : "songs"} in milim · {n} {n === 1 ? "is" : "are"} missing nikud
          </p>
          {n > 0 && (
            <button type="button" onClick={() => void run(queue)} className="h-12 rounded-xl bg-accent text-sm font-bold text-accent-contrast">
              Add nikud to {n} {n === 1 ? "song" : "songs"}
            </button>
          )}
        </>
      )}

      {phase === "running" && (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">
                Song {position + 1} of {n}
              </span>
              <span className="text-muted">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-border bg-surface-2">
              <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-muted">Working on: {current}. Keep this screen open.</p>
          </div>
          <button type="button" onClick={() => (stopRequested.current = true)} className="h-11 rounded-xl border border-border text-sm font-semibold hover:bg-surface-2">
            Stop
          </button>
        </>
      )}

      {phase === "done" && (
        <>
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface-2 p-3 text-sm">
            <p className="font-bold">Finished</p>
            <p>
              {fixed} {fixed === 1 ? "song now has" : "songs now have"} nikud
            </p>
            {failed.length > 0 && (
              <p className="text-danger">
                {failed.length} {failed.length === 1 ? "song needs" : "songs need"} another go ({failed.map((f) => f.title).join(", ")})
              </p>
            )}
          </div>
          {failed.length > 0 && (
            <button type="button" onClick={() => void run(failed)} className="h-11 rounded-xl border border-border text-sm font-semibold hover:bg-surface-2">
              Run again for the {failed.length} left
            </button>
          )}
        </>
      )}

      <p className="text-xs text-muted">This card is temporary and will be removed once every song has nikud.</p>
    </section>
  );
}
