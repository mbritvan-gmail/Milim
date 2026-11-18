"use client";

import { useState } from "react";
import { getWordForms } from "../word-forms/actions";
import { verbsNeedingConjugation } from "./forms-actions";

type Report = { done: number; input: number; output: number; failed: { lemma: string; reason: string }[] };

const PARALLEL = 3;

// Writes and saves the conjugation of every verb that doesn't have one, a few at a time, and reports the Claude
// tokens used (and the average per verb) so you can judge the cost of doing this automatically.
export function ConjugateAll() {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setState("running");
    setError("");
    setReport(null);
    const list = await verbsNeedingConjugation().catch(() => ({ ok: false as const, error: "Couldn't load the verbs." }));
    if (!list.ok) {
      setError(list.error);
      setState("idle");
      return;
    }
    const verbs = list.verbs;
    const total: Report = { done: 0, input: 0, output: 0, failed: [] };
    let next = 0;
    let finished = 0;
    async function worker() {
      while (next < verbs.length) {
        const verb = verbs[next++];
        const r = await getWordForms(verb.id).catch(() => null);
        const used = r && r.ok ? r.usage : undefined;
        total.input += used?.input ?? 0;
        total.output += used?.output ?? 0;
        if (r && r.ok) total.done++;
        else total.failed.push({ lemma: verb.lemma, reason: r && !r.ok ? r.error : "The request didn't finish." });
        finished++;
        setProgress(`Verb ${finished} of ${verbs.length}`);
      }
    }
    setProgress(`Verb 0 of ${verbs.length}`);
    await Promise.all(Array.from({ length: Math.min(PARALLEL, verbs.length) }, worker));
    setReport(total);
    setProgress("");
    setState("done");
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Conjugation</h2>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">Conjugate all verbs</p>
          <p className="text-xs text-muted">
            Writes and saves the conjugation of every verb that doesn&apos;t have one yet, so it opens instantly. This uses Claude, and it reports the tokens
            used. Keep this page open until it finishes.
          </p>
        </div>
        <button type="button" onClick={run} disabled={state === "running"} className="shrink-0 rounded-xl border border-border px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-60">
          {state === "running" ? "Working…" : "Run"}
        </button>
      </div>
      {progress && <p role="status" className="text-sm text-muted">{progress}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {report && (
        <p role="status" className="text-sm">
          {report.done === 0 && report.failed.length === 0
            ? "All verbs already have their conjugation."
            : `Done: ${report.done} ${report.done === 1 ? "verb" : "verbs"}. Claude used ${report.input.toLocaleString()} input and ${report.output.toLocaleString()} output tokens${
                report.done > 0 ? `, about ${Math.round(report.input / report.done).toLocaleString()} and ${Math.round(report.output / report.done).toLocaleString()} per verb` : ""
              }.`}
          {report.failed.length > 0 && ` ${report.failed.length} failed; run it again to retry.`}
        </p>
      )}
      {report && report.failed.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-danger">
          {report.failed.slice(0, 10).map((f) => (
            <li key={f.lemma}>
              <span lang="he" className="hebrew">{f.lemma}</span>: {f.reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
