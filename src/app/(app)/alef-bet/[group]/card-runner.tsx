"use client";

import { useEffect, useState } from "react";
import { CloseButton, CloseOrLink } from "@/components/overlay";
import { plainHebrew, type LetterCard } from "@/lib/alef-bet/letters";
import { markCardSeen } from "../actions";

// How big the glyphs in the Print / Script panels are: one letter is large, a letter with its final form
// or a pair of vowel signs a little smaller.
function glyphSize(card: LetterCard) {
  if (card.kind === "vowel") return "text-6xl";
  return card.print.includes(" ") ? "text-7xl" : "text-[112px]";
}

export function CardRunner({
  cards,
  startIndex,
  groupNumber,
  groupName,
  showNikud,
  showTranslit,
  scriptClass,
  backHref,
}: {
  cards: LetterCard[];
  startIndex: number;
  groupNumber: number;
  groupName: string;
  showNikud: boolean;
  showTranslit: boolean;
  /** className of the handwriting font (loaded on the server). */
  scriptClass: string;
  backHref: string;
}) {
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), cards.length - 1));
  const [saveProblem, setSaveProblem] = useState(false);
  const card = cards[index];
  const next = cards[index + 1];
  const isLast = index === cards.length - 1;

  // A card counts as seen as soon as it is on screen.
  useEffect(() => {
    let current = true;
    markCardSeen(card.id)
      .then((ok) => current && !ok && setSaveProblem(true))
      .catch(() => current && setSaveProblem(true));
    return () => {
      current = false;
    };
  }, [card.id]);

  // The vowel signs are the lesson, so they always show with their marks; words follow the setting.
  const withNikud = showNikud || card.kind === "vowel";
  const ex = card.example;
  const lead = withNikud ? ex.lead : plainHebrew(ex.lead);
  const rest = withNikud ? ex.hebrew.slice(ex.lead.length) : plainHebrew(ex.hebrew.slice(ex.lead.length));
  const nextLabel = next ? (next.kind === "letter" ? next.print.split(" ")[0] : next.name) : "";

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col gap-3 px-4 pb-6 pt-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <CloseButton fallbackHref={backHref} />
          <p className="text-sm text-muted">
            {groupName} · {card.kind === "letter" ? "Letter" : "Sign"} {index + 1} of {cards.length}
          </p>
          <span className="w-10" />
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={cards.length}
          aria-valuenow={index + 1}
          aria-label={`Group ${groupNumber} progress`}
        >
          <div className="h-full bg-accent transition-all" style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
        </div>
      </div>

      <div className={`grid gap-2.5 ${card.script ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-2.5 pb-1.5 pt-2.5">
          <span className="text-[11px] uppercase tracking-wide text-muted">{card.kind === "vowel" ? "Signs" : "Print"}</span>
          <span lang="he" className={`hebrew whitespace-pre font-bold leading-[1.15] text-accent ${glyphSize(card)}`}>
            {card.print}
          </span>
        </div>
        {card.script && (
          <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-2.5 pb-1.5 pt-2.5">
            <span className="text-[11px] uppercase tracking-wide text-muted">Script</span>
            <span lang="he" className={`${scriptClass} whitespace-pre leading-[1.15] text-seg-suffix ${glyphSize(card)}`} dir="rtl">
              {card.script}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2.5 px-1">
        <h1 className="text-3xl font-semibold">{card.name}</h1>
        <span className="text-sm text-muted">{card.nameNote ? `${card.kind === "letter" ? "letter name" : "sound"} · ${card.nameNote}` : card.kind === "letter" ? "letter name" : "vowel sound"}</span>
      </div>

      <ul className="flex flex-col gap-2">
        {card.sounds.map((sound, i) => (
          <li key={i} className="flex items-center gap-3.5 rounded-xl border border-border bg-surface px-3.5 py-2">
            <span lang="he" className="hebrew w-14 shrink-0 text-center text-4xl font-bold leading-none text-accent">
              {sound.form}
            </span>
            <div className="flex flex-col">
              <p className="text-[17px] font-semibold">
                {sound.say} <span className="font-normal text-muted">{sound.like}</span>
              </p>
              {sound.note && <p className="text-xs text-muted">{sound.note}</p>}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-0.5 rounded-xl bg-surface-2 px-3.5 py-2.5">
        <span className="text-[11px] uppercase tracking-wide text-muted">Example word</span>
        <div className="flex items-baseline gap-3">
          <span lang="he" className="hebrew text-3xl">
            <span className="font-bold text-accent">{lead}</span>
            {rest}
          </span>
          <span className="text-sm">
            {showTranslit && <i className="text-muted">{ex.translit}</i>}
            {showTranslit && " · "}
            {ex.english}
          </span>
        </div>
      </div>

      {card.note && (
        <p className="rounded-xl border border-border px-3.5 py-2.5 text-[13px] leading-snug text-muted">{card.note}</p>
      )}

      {saveProblem && (
        <p role="alert" className="rounded-xl border border-warn/50 bg-surface p-3 text-sm text-warn">
          Your progress couldn&apos;t be saved right now. The cards still work.
        </p>
      )}

      <div className="mt-auto flex gap-2 pt-2">
        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="h-13 rounded-2xl border border-border px-5 font-medium hover:bg-surface"
          >
            Back
          </button>
        )}
        {isLast ? (
          <CloseOrLink
            href={backHref}
            className="flex h-13 flex-1 items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-contrast hover:bg-accent-strong"
          >
            Finish {groupName.toLowerCase()}
          </CloseOrLink>
        ) : (
          <button
            type="button"
            onClick={() => setIndex(index + 1)}
            className="h-13 flex-1 rounded-2xl bg-accent text-base font-semibold text-accent-contrast hover:bg-accent-strong"
          >
            Next: <span lang="he">{nextLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
