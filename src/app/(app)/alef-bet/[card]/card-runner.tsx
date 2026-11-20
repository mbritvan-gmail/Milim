"use client";

import { useState } from "react";
import { CloseButton, CloseOrLink } from "@/components/overlay";
import { DEFAULT_VOWEL, VOWEL_OPTIONS, plainHebrew, positionLabel, soundClipId, soundGlyph, syllableLabel, type LetterCard, type VowelId } from "@/lib/alef-bet/letters";
import type { SpeechVoice } from "@/lib/settings";
import { exampleClipId, nameClipId } from "@/lib/alef-bet/audio-clips";
import { SpeakerButton } from "./speaker-button";

// How big the glyphs in the Print / Script panels are: one letter is large, a letter with its final form
// or a pair of vowel signs a little smaller.
function glyphSize(card: LetterCard) {
  if (card.kind === "vowel") return "text-6xl";
  return card.print.includes(" ") ? "text-7xl" : "text-[112px]";
}

export function CardRunner({
  cards,
  startIndex,
  showNikud,
  showTranslit,
  voice,
  scriptClass,
  backHref,
}: {
  cards: LetterCard[];
  startIndex: number;
  showNikud: boolean;
  showTranslit: boolean;
  /** Which recording the speaker buttons play (the Voice setting). */
  voice: SpeechVoice;
  /** className of the handwriting font (loaded on the server). */
  scriptClass: string;
  backHref: string;
}) {
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), cards.length - 1));
  // The vowel the sounds are shown and played with. It stays as chosen while moving between letters.
  const [vowel, setVowel] = useState<VowelId>(DEFAULT_VOWEL);
  const card = cards[index];
  const isLast = index === cards.length - 1;

  // The vowel signs are the lesson, so they always show with their marks; words follow the setting.
  const withNikud = showNikud || card.kind === "vowel";
  const ex = card.example;
  const lead = withNikud ? ex.lead : plainHebrew(ex.lead);
  const rest = withNikud ? ex.hebrew.slice(ex.lead.length) : plainHebrew(ex.hebrew.slice(ex.lead.length));

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col gap-3 px-4 pb-6 pt-4">
      <div className="flex items-center justify-between gap-3">
        <span className="w-10" />
        <p className="text-sm text-muted">{positionLabel(card)}</p>
        <CloseButton fallbackHref={backHref} />
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

      <div className="flex items-center gap-2.5 px-1">
        <h1 className="text-3xl font-semibold">{card.name}</h1>
        <span className="text-sm text-muted">{card.nameNote ? `${card.kind === "letter" ? "letter name" : "sound"} · ${card.nameNote}` : card.kind === "letter" ? "letter name" : "vowel sound"}</span>
        <span className="ml-auto">
          <SpeakerButton voice={voice} clipId={nameClipId(card)} label={`Hear the name: ${card.name}`} />
        </span>
      </div>

      {card.kind === "letter" && (
        <div role="group" aria-label="Vowel for the sounds" className="flex items-center gap-2 px-1">
          <span className="text-sm text-muted">Vowel</span>
          <div className="flex flex-1 gap-1.5">
            {VOWEL_OPTIONS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVowel(v.id)}
                aria-pressed={vowel === v.id}
                className={`h-10 flex-1 rounded-full border text-base font-semibold transition-colors ${vowel === v.id ? "border-transparent bg-accent text-accent-contrast" : "border-border text-muted hover:bg-surface hover:text-foreground"}`}
              >
                {v.id}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {card.sounds.map((sound, i) => {
          const syllable = syllableLabel(card, i, vowel);
          return (
            <li key={i} className="flex items-center gap-3.5 rounded-xl border border-border bg-surface px-3.5 py-2">
              <span lang="he" className="hebrew w-14 shrink-0 text-center text-4xl font-bold leading-none text-accent">
                {soundGlyph(card, i, vowel)}
              </span>
              <div className="flex flex-col">
                <p className="text-[17px] font-semibold">
                  {syllable} <span className="font-normal text-muted">{card.kind === "letter" ? `${sound.say} ${sound.like}` : sound.like}</span>
                </p>
                {sound.note && <p className="text-xs text-muted">{sound.note}</p>}
              </div>
              <span className="ml-auto">
                <SpeakerButton voice={voice} clipId={soundClipId(card, i, vowel)} label={`Hear the sound: ${syllable}`} />
              </span>
            </li>
          );
        })}
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
          <span className="ml-auto">
            <SpeakerButton voice={voice} clipId={exampleClipId(card)} label={`Hear the word: ${ex.translit}`} />
          </span>
        </div>
      </div>

      {card.note && (
        <p className="rounded-xl border border-border px-3.5 py-2.5 text-[13px] leading-snug text-muted">{card.note}</p>
      )}

      {/* Hebrew reads right to left, so Next is on the left and Previous on the right. Same size; at the first card
          Previous is dimmed rather than removed so the buttons never move. */}
      <div className="mt-auto flex gap-2 pt-2">
        {isLast ? (
          <CloseOrLink
            href={backHref}
            className="flex h-13 flex-1 items-center justify-center rounded-2xl border border-transparent bg-accent text-base font-semibold text-accent-contrast hover:bg-accent-strong"
          >
            Done
          </CloseOrLink>
        ) : (
          <button
            type="button"
            onClick={() => setIndex(index + 1)}
            className="h-13 flex-1 rounded-2xl border border-transparent bg-accent text-base font-semibold text-accent-contrast hover:bg-accent-strong"
          >
            Next
          </button>
        )}
        <button
          type="button"
          onClick={() => setIndex(index - 1)}
          disabled={index === 0}
          className="h-13 flex-1 rounded-2xl border border-border text-base font-semibold hover:bg-surface disabled:opacity-35 disabled:hover:bg-transparent"
        >
          Previous
        </button>
      </div>
    </div>
  );
}
