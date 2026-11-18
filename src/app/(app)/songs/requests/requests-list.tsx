"use client";

import Link from "next/link";
import { useState } from "react";
import { Cover } from "@/components/song-links";
import { cancelRequest } from "./actions";

export type RequestRow = {
  id: string;
  title: string;
  artist: string | null;
  coverUrl: string | null;
  status: "open" | "fulfilled";
  songId: string | null;
  mine: boolean;
  requesterName: string | null;
  fulfilledByName: string | null;
  createdAt: string;
};

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function RequestsList({ requests: initial, cancel = cancelRequest }: { requests: RequestRow[]; cancel?: typeof cancelRequest }) {
  const [requests, setRequests] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState("");

  async function doCancel(id: string) {
    setBusyId(id);
    setProblem("");
    const error = await cancel(id).catch(() => "Couldn't cancel that request. Please try again.");
    setBusyId(null);
    if (error) setProblem(error);
    else setRequests((rs) => rs.filter((r) => r.id !== id));
  }

  const open = requests.filter((r) => r.status === "open");
  const done = requests.filter((r) => r.status === "fulfilled");

  return (
    <>
      <p className="text-sm text-muted">Songs people would like in milim. Anyone can add the lyrics.</p>
      {problem && <p className="text-sm text-danger">{problem}</p>}

      {open.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">No open requests. Use the menu to request a song.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {open.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2 pr-3">
              <Cover url={r.coverUrl} size={52} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{r.title}</span>
                {r.artist && <span className="truncate text-sm">{r.artist}</span>}
                <span className="truncate text-xs text-muted">
                  Requested by {r.mine ? "you" : (r.requesterName ?? "someone")} · {ago(r.createdAt)}
                </span>
              </span>
              {r.mine ? (
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => doCancel(r.id)}
                  className="h-9 shrink-0 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-surface-2 disabled:opacity-60"
                >
                  {busyId === r.id ? "…" : "Cancel"}
                </button>
              ) : (
                <Link href={`/songs/new?request=${r.id}`} className="flex h-9 shrink-0 items-center rounded-xl bg-accent px-3 text-sm font-semibold text-accent-contrast hover:bg-accent-strong">
                  Add lyrics
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <h2 className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted">Done</h2>
          <ul className="flex flex-col gap-2">
            {done.map((r) => (
              <li key={r.id} className={`flex items-center gap-3 rounded-2xl border bg-surface p-2 pr-3 ${r.mine ? "border-success" : "border-border opacity-80"}`}>
                <Cover url={r.coverUrl} size={52} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{r.title}</span>
                  {r.artist && <span className="truncate text-sm">{r.artist}</span>}
                  <span className={`truncate text-xs ${r.mine ? "font-semibold text-success" : "text-muted"}`}>
                    {r.mine
                      ? `Your request is ready${r.fulfilledByName ? ` · added by ${r.fulfilledByName}` : ""}`
                      : `Requested by ${r.requesterName ?? "someone"}${r.fulfilledByName ? ` · added by ${r.fulfilledByName}` : ""}`}
                  </span>
                </span>
                {r.songId && (
                  <Link
                    href={`/songs/${r.songId}`}
                    className={`flex h-9 shrink-0 items-center rounded-xl px-3 text-sm font-semibold ${r.mine ? "bg-accent text-accent-contrast hover:bg-accent-strong" : "border border-border hover:bg-surface-2"}`}
                  >
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
