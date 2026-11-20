"use client";

import { CloseOrLink } from "@/components/overlay";
import { useRef, useState } from "react";
import { WordCardBack } from "@/components/word-card-back";
import { FormsButton } from "@/components/word-forms";
import { formsKind } from "@/lib/word-forms";
import { hebrewText } from "@/lib/modules";
import {
  applyAnswer,
  cardDirection,
  currentCard,
  isDone,
  startSession,
  undoLast,
  type AnswerKind,
  type Direction,
  type Session,
  type SessionCard,
} from "@/lib/study";
import { markWordKnown } from "../dictionary/actions";
import { restoreWord, reviewCard } from "./actions";

const DIRECTION_LABEL: Record<Direction, string> = {
  "he-en": "Hebrew → English",
  "en-he": "English → Hebrew",
  mixed: "Mixed",
};
const NEXT_DIRECTION: Record<Direction, Direction> = { "he-en": "en-he", "en-he": "mixed", mixed: "he-en" };

// A steady "random" pick per card showing, so a card keeps its face while it is on screen.
function faceFor(direction: Direction, vocabId: string, shown: number) {
  let h = shown * 31;
  for (let i = 0; i < vocabId.length; i++) h = (h * 31 + vocabId.charCodeAt(i)) % 9973;
  return cardDirection(direction, () => (h % 100) / 100);
}

export function StudyRunner({
  cards,
  learnAfter,
  defaultDirection,
  showTranslit,
  showNikud,
  backHref,
  backLabel,
  studyName,
}: {
  cards: SessionCard[];
  learnAfter: number;
  defaultDirection: Direction;
  showTranslit: boolean;
  showNikud: boolean;
  backHref: string;
  backLabel: string;
  studyName: string;
}) {
  const [session, setSession] = useState<Session>(() => startSession(cards));
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<Direction>(defaultDirection);
  const [saveProblem, setSaveProblem] = useState(false);

  // Saves go out one at a time, in order, so an Undo can never overtake the answer it undoes.
  const saves = useRef<Promise<unknown>>(Promise.resolve());
  function save(task: () => Promise<boolean>) {
    saves.current = saves.current
      .then(task)
      .then((ok) => {
        if (!ok) setSaveProblem(true);
      })
      .catch(() => setSaveProblem(true));
  }

  const card = currentCard(session);
  const done = isDone(session);
  const left = session.queue.length;
  const finished = Math.max(0, session.total - left);

  function answer(kind: AnswerKind) {
    const result = applyAnswer(session, kind, learnAfter);
    if (!result) return;
    setSession(result.session);
    setFlipped(false);
    const id = result.vocabId;
    if (kind === "know") save(() => markWordKnown(id));
    else if (!(kind === "got" && result.before.status === "learned")) save(() => reviewCard(id, kind === "got"));
  }

  function undo() {
    const result = undoLast(session);
    if (!result) return;
    setSession(result.session);
    setFlipped(false);
    const { vocabId, restore } = result;
    save(() => restoreWord(vocabId, restore.status !== "new", restore.count, restore.status === "learned", restore.misses));
  }

  const header = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex gap-2">
        <CloseOrLink
          href={backHref}
          ariaLabel="Exit"
          hideInOverlay
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-lg text-muted hover:bg-surface hover:text-foreground"
        >
          ✕
        </CloseOrLink>
        <button
          type="button"
          onClick={undo}
          disabled={session.history.length === 0}
          aria-label="Undo last answer"
          title="Undo last answer"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-xl text-muted hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ↶
        </button>
      </div>
      <p className="font-medium">
        {left} <span className="font-normal text-muted">left</span>
      </p>
      {done ? (
        <span className="w-10" />
      ) : (
        <button
          type="button"
          onClick={() => setDirection(NEXT_DIRECTION[direction])}
          aria-label="Change direction"
          className="rounded-full border border-border px-3 py-1.5 text-sm text-accent hover:bg-surface"
        >
          {DIRECTION_LABEL[direction]} ⇄
        </button>
      )}
    </div>
  );

  const progress = (
    <div className="h-1.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={session.total} aria-valuenow={finished}>
      <div className="h-full bg-accent transition-all" style={{ width: `${Math.round((finished / session.total) * 100)}%` }} />
    </div>
  );

  const problem = saveProblem && (
    <p role="alert" className="rounded-xl border border-warn/50 bg-surface p-3 text-sm text-warn">
      Some answers couldn&apos;t be saved. Check your connection; they may show up again next time.
    </p>
  );

  if (done || !card) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        {progress}
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-7 text-center">
          <p className="text-sm text-muted">Nothing left in {studyName}</p>
          <p className="text-4xl font-bold text-accent">All done</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
            {[
              [session.stats.got, "got it"],
              [session.stats.again, "still learning"],
              [session.stats.known, "already knew"],
            ].map(([n, label]) => (
              <div key={label as string} className="rounded-xl bg-surface-2 px-1 py-2.5">
                <b className="block text-xl font-semibold text-foreground">{n}</b>
                {label}
              </div>
            ))}
          </div>
        </div>
        {problem}
        <CloseOrLink href={backHref} className="flex h-12 items-center justify-center rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong">
          {backLabel}
        </CloseOrLink>
      </div>
    );
  }

  const face = faceFor(direction, card.vocabId, session.history.length);

  return (
    <div className="flex flex-col gap-4">
      {header}
      {progress}

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show the first side" : "Reveal the answer"}
        className="flex min-h-80 w-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-surface p-5 text-center transition-colors hover:bg-surface-2"
      >
        {!flipped ? (
          face === "he-en" ? (
            <>
              {/* No pronunciation on a Hebrew-first card: reading the word is the point. */}
              <span lang="he" className="hebrew text-6xl font-bold text-accent">
                {hebrewText(card.lemma, card.vocalized, showNikud)}
              </span>
              <span className="mt-4 text-xs text-muted">Tap the card to reveal the meaning</span>
            </>
          ) : (
            <>
              <span className="text-4xl font-semibold leading-tight text-foreground">{card.english}</span>
              {card.partOfSpeech && <span className="text-sm text-muted">{card.partOfSpeech}</span>}
              <span className="mt-4 text-xs text-muted">Tap the card to reveal the Hebrew</span>
            </>
          )
        ) : (
          <WordCardBack
            lemma={card.lemma}
            vocalized={card.vocalized}
            gender={card.gender}
            plural={card.plural}
            showNikud={showNikud}
            transliteration={card.transliteration}
            english={card.english}
            partOfSpeech={card.partOfSpeech}
            face={face}
            showTranslit={showTranslit}
            heardIn={card.context ? [card.context] : []}
            status={card.status}
            count={card.count}
            learnAfter={learnAfter}
          />
        )}
      </button>

      {flipped && (
        <>
          {formsKind(card.partOfSpeech) && (
            <FormsButton
              key={card.vocabId}
              vocabId={card.vocabId}
              kind={formsKind(card.partOfSpeech)!}
              lemma={card.lemma}
              english={card.english}
              showTranslit={showTranslit}
              showNikud={showNikud}
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => answer("again")}
              className="h-12 flex-1 rounded-xl border border-warn/60 font-semibold text-warn hover:bg-warn/10"
            >
              Still learning
            </button>
            <button
              type="button"
              onClick={() => answer("got")}
              className="h-12 flex-1 rounded-xl bg-success font-semibold text-accent-contrast hover:opacity-90"
            >
              Got it
            </button>
          </div>
          {card.status !== "learned" ? (
            <button
              type="button"
              onClick={() => answer("know")}
              className="h-11 rounded-xl border border-border font-medium hover:bg-surface"
            >
              I know this
            </button>
          ) : (
            <p className="text-center text-xs text-muted">&quot;Still learning&quot; moves this word back to Learning.</p>
          )}
        </>
      )}
      {problem}
    </div>
  );
}
