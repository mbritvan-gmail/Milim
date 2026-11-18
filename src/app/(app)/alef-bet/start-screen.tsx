import Link from "next/link";
import { CARDS, VOWEL_CARDS, nextGroup, progressFor, wordsUnlocked, type GroupProgress } from "@/lib/alef-bet/letters";

// The Alef-bet start screen: groups in alphabet order and how many cards of each have been seen.
export function StartScreen({ seen, notSaved, basicWordsPackId }: { seen: Set<string>; notSaved: boolean; basicWordsPackId: string | null }) {
  const progress = progressFor(seen);
  const next = nextGroup(progress);
  const unlocked = wordsUnlocked(progress);
  const lettersSeen = CARDS.filter((c) => seen.has(c.id)).length;
  const vowelsSeen = VOWEL_CARDS.filter((c) => seen.has(c.id)).length;
  const label = (p: GroupProgress) => p.group.plainTitle ?? p.group.title;

  return (
    <>
      <header>
        <h1 className="text-3xl font-semibold leading-tight">Alef-bet</h1>
        <p className="text-sm text-muted">Read Hebrew, in print and in script</p>
      </header>

      {notSaved && (
        <p role="status" className="rounded-xl border border-warn/50 bg-surface p-3 text-sm text-warn">
          Your progress can&apos;t be saved yet: the Alef-bet database update hasn&apos;t been run. The cards still work.
        </p>
      )}

      <section className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">
            Letters: {lettersSeen} of {CARDS.length} seen
          </span>
          <span className="text-sm text-muted">
            Vowels: {vowelsSeen} of {VOWEL_CARDS.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-success"
            style={{ width: `${Math.round(((lettersSeen + vowelsSeen) / (CARDS.length + VOWEL_CARDS.length)) * 100)}%` }}
          />
        </div>
        {next ? (
          <Link
            href={`/alef-bet/${next.group.n}`}
            className="flex h-12 items-center justify-center rounded-xl bg-accent px-3 text-base font-semibold text-accent-contrast hover:bg-accent-strong"
          >
            {next.status === "new" && next.group.n === 1 ? "Start with " : "Continue: "}
            <span lang="he" className={next.group.plainTitle ? "ml-1" : "hebrew ml-2 tracking-[0.14em]"}>
              {label(next)}
            </span>
          </Link>
        ) : (
          <>
            <p className="text-sm text-success">You have seen every card. Basic words are open.</p>
            {basicWordsPackId && (
              <Link
                href={`/vocabulary/${basicWordsPackId}`}
                className="flex h-12 items-center justify-center rounded-xl bg-accent px-3 text-base font-semibold text-accent-contrast hover:bg-accent-strong"
              >
                Open Basic words
              </Link>
            )}
          </>
        )}
      </section>

      <ul className="flex flex-col gap-2">
        {progress.map((p) => {
          const done = p.status === "done";
          const started = p.status === "started";
          return (
            <li key={p.group.n}>
              <Link
                href={`/alef-bet/${p.group.n}`}
                className={`flex items-center gap-3 rounded-xl border bg-surface px-3.5 py-2.5 hover:bg-surface-2 ${started ? "border-accent" : "border-border"}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold ${
                    done
                      ? "border-success bg-success/15 text-success"
                      : started
                        ? "border-accent bg-accent text-accent-contrast"
                        : "border-border text-muted"
                  }`}
                >
                  {done ? "✓" : p.group.n}
                </span>
                <span
                  lang={p.group.plainTitle ? undefined : "he"}
                  className={`flex-1 ${p.group.plainTitle ? "text-base font-semibold" : "hebrew text-left text-2xl leading-snug tracking-[0.14em]"}`}
                >
                  {label(p)}
                </span>
                <span
                  className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    done ? "border-success bg-success/15 text-success" : started ? "border-accent text-accent" : "border-border text-muted"
                  }`}
                >
                  {done ? "Done" : started ? `${p.seen} of ${p.total} seen` : "Not started"}
                </span>
              </Link>
            </li>
          );
        })}

        <li>
          {(() => {
            const row = (
              <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${unlocked && basicWordsPackId ? "border-accent bg-surface hover:bg-surface-2" : "border-border bg-surface opacity-85"}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-[13px] font-semibold text-muted">
                  {progress.length + 1}
                </span>
                <span className={`flex-1 text-base font-semibold ${unlocked ? "" : "text-muted"}`}>Basic words</span>
                <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${unlocked && basicWordsPackId ? "border-accent text-accent" : "border-border text-muted"}`}>
                  {!unlocked ? "Locked" : basicWordsPackId ? "Open" : "Not set up"}
                </span>
              </div>
            );
            // Basic words is a normal Word Pack: its page has Add, then Start flash cards.
            return unlocked && basicWordsPackId ? <Link href={`/vocabulary/${basicWordsPackId}`}>{row}</Link> : row;
          })()}
          {!unlocked && <p className="px-1 pt-1.5 text-xs text-muted">Opens once you have seen every card.</p>}
          {unlocked && !basicWordsPackId && (
            <p className="px-1 pt-1.5 text-xs text-muted">The public Word Pack called &ldquo;Basic words&rdquo; wasn&apos;t found.</p>
          )}
        </li>
      </ul>
    </>
  );
}
