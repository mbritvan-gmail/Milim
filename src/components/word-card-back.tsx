import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import type { WordStatus } from "@/lib/study";

export type HeardIn = { songTitle: string | null; hebrew: string; transliteration: string | null; href?: string };

export function remainingText(status: WordStatus, count: number, learnAfter: number) {
  if (status === "new") return "Not practiced yet";
  if (status === "learned") return "You know this one";
  return `${learnAfter - Math.min(count, learnAfter - 1)} more correct to learn it`;
}

// The back of a word card: the same look on the study cards and on a word's page in the Dictionary,
// so it always reads the same way. Only inline elements are used, so it can sit inside a button.
export function WordCardBack({
  lemma,
  transliteration,
  english,
  partOfSpeech,
  face,
  showTranslit,
  heardIn,
  status,
  count,
  learnAfter,
  showStatus = true,
}: {
  lemma: string;
  transliteration: string | null;
  english: string;
  partOfSpeech: string | null;
  /** Which side was shown first: the other side is what leads on the back. */
  face: "he-en" | "en-he";
  showTranslit: boolean;
  heardIn: HeardIn[];
  status: WordStatus;
  count: number;
  learnAfter: number;
  /** Hide the status line when the surrounding screen shows its own live one. */
  showStatus?: boolean;
}) {
  const translit = showTranslit && transliteration ? <span className="text-base italic text-muted">{transliteration}</span> : null;
  return (
    <>
      {face === "he-en" ? (
        <>
          <span className="text-4xl font-semibold leading-tight text-foreground">{english}</span>
          <span lang="he" className="hebrew text-3xl text-accent">
            {lemma}
          </span>
          {translit}
        </>
      ) : (
        <>
          <span lang="he" className="hebrew text-6xl font-bold text-accent">
            {lemma}
          </span>
          {translit}
          <span className="text-2xl text-foreground">{english}</span>
        </>
      )}
      {partOfSpeech && <span className="text-sm text-muted">{partOfSpeech}</span>}

      {heardIn.map((h, i) => {
        const body = (
          <>
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Heard in {h.songTitle ?? "a song"}
            </span>
            <span lang="he" className="hebrew block text-lg">
              {h.hebrew}
            </span>
            {showTranslit && h.transliteration && <span className="mt-1 block text-sm italic text-muted">{h.transliteration}</span>}
          </>
        );
        const box = "mt-2 block w-full rounded-xl bg-surface-2 p-3";
        return h.href ? (
          <Link key={i} href={h.href} className={`${box} hover:bg-surface`}>
            {body}
          </Link>
        ) : (
          <span key={i} className={box}>
            {body}
          </span>
        );
      })}

      {showStatus && (
        <span className="mt-1 flex items-center justify-center gap-2 text-sm text-muted">
          <StatusBadge status={status} count={count} learnAfter={learnAfter} />
          {remainingText(status, count, learnAfter)}
        </span>
      )}
    </>
  );
}
