"use client";

import { useEffect, useState } from "react";
import { CloseButton, CloseOrLink } from "@/components/overlay";
import { nikudRows, plainHebrew, positionLabel, wordClipId, type LetterCard } from "@/lib/alef-bet/letters";
import type { SpeechVoice } from "@/lib/settings";
import { clipSrc, nameClipId } from "@/lib/alef-bet/audio-clips";
import { playClips, stopClips } from "@/lib/alef-bet/play";
import { SpeakerButton } from "./speaker-button";

// How big the glyphs in the Print / Script panels are: one letter is large; a letter with its dotted, undotted and
// final forms (or a pair of vowel signs) is smaller so they all fit side by side.
function glyphSize(card: LetterCard, text: string) {
  if (card.kind === "vowel") return "text-6xl";
  const count = text.split(/\s+/).length;
  return count === 1 ? "text-[112px]" : count === 2 ? "text-7xl" : "text-5xl";
}

const SPEAKER_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
  </svg>
);

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
  const card = cards[index];
  // A clip never carries on over the next card or after the card is closed.
  useEffect(() => () => stopClips(), [index]);
  const isLast = index === cards.length - 1;
  // A letter whose dot changes its name shows its forms side by side (bet and vet), in print and in script.
  const printText = card.forms ? card.forms.join(" ") : card.print;
  const scriptText = card.forms ? card.forms.join(" ") : card.script;

  function play(clipId: string) {
    const src = clipSrc(clipId, voice) ?? clipSrc(clipId, voice === "female" ? "male" : "female");
    if (src) playClips([src]);
  }

  // The vowel signs are the lesson, so they always show with their marks; words follow the setting.
  const withNikud = showNikud || card.kind === "vowel";
  const show = (text: string) => (withNikud ? text : plainHebrew(text));

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col gap-3 px-4 pb-6 pt-4">
      <div className="flex items-center justify-between gap-3">
        <span className="w-10" />
        <p className="text-sm text-muted">{positionLabel(card)}</p>
        <CloseButton fallbackHref={backHref} />
      </div>

      <div className={`grid gap-2.5 ${scriptText ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-2.5 pb-1.5 pt-2.5">
          <span className="text-[11px] uppercase tracking-wide text-muted">{card.kind === "vowel" ? "Signs" : "Print"}</span>
          <span lang="he" className={`hebrew whitespace-pre font-bold leading-[1.15] text-accent ${glyphSize(card, printText)}`}>
            {printText}
          </span>
        </div>
        {scriptText && (
          <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-2.5 pb-1.5 pt-2.5">
            <span className="text-[11px] uppercase tracking-wide text-muted">Script</span>
            <span lang="he" className={`${scriptClass} whitespace-pre leading-[1.15] text-seg-suffix ${glyphSize(card, scriptText)}`} dir="rtl">
              {scriptText}
            </span>
          </div>
        )}
      </div>

      {/* A letter whose dot changes its name has two (bet and vet): each with its own speaker. */}
      <div className="flex items-center gap-2.5 px-1">
        <h1 className="text-3xl font-semibold">{card.name}</h1>
        {card.name2 ? (
          <>
            <SpeakerButton voice={voice} clipId={nameClipId(card)} label={`Hear the name: ${card.name}`} />
            <span className="ml-1 text-3xl font-semibold text-muted">{card.name2}</span>
            <SpeakerButton voice={voice} clipId={nameClipId(card, true)} label={`Hear the name: ${card.name2}`} />
          </>
        ) : (
          <>
            <span className="text-sm text-muted">{card.kind === "letter" ? "letter name" : "vowel sound"}</span>
            <span className="ml-auto">
              <SpeakerButton voice={voice} clipId={nameClipId(card)} label={`Hear the name: ${card.name}`} />
            </span>
          </>
        )}
      </div>

      {card.kind === "letter" ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-0.5">
            <h2 className="text-[17px] font-semibold">Nikud</h2>
            <span lang="he" className="hebrew text-lg font-semibold leading-none text-muted">
              ניקוד
            </span>
          </div>
          {/* The nikud in order, down the page. Tap a cell to hear that letter with that nikud. A letter with two forms lists the first on the right, the way Hebrew reads. */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {nikudRows(card).map((row, r) => (
              <div key={row.vowel} className={`flex flex-row-reverse items-center ${r > 0 ? "border-t border-border" : ""}`}>
                {row.cells.map((cell) => (
                  <button
                    key={cell.clipId}
                    type="button"
                    onClick={() => play(cell.clipId)}
                    aria-label={`Hear ${cell.label}`}
                    className="flex h-[58px] min-w-0 flex-1 items-center justify-between gap-2 px-3.5 hover:bg-surface-2"
                  >
                    <span lang="he" className="hebrew whitespace-pre text-[30px] font-bold leading-none tracking-[0.04em]">
                      {cell.glyph}
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-accent">{SPEAKER_ICON}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <ul className="flex flex-col gap-2">
          {card.sounds.map((sound, i) => (
            <li key={i} className="flex items-center gap-3.5 rounded-xl border border-border bg-surface px-3.5 py-2">
              <div className="flex flex-1 flex-col">
                <p className="text-[17px] font-semibold">{sound.say}</p>
                {sound.note && <p className="text-xs text-muted">{sound.note}</p>}
              </div>
              <span lang="he" className="hebrew w-14 shrink-0 text-center text-4xl font-bold leading-none text-accent">
                {sound.form}
              </span>
              <SpeakerButton voice={voice} clipId={`${card.id}-sound-${i + 1}`} label={`Hear the sound: ${sound.say}`} />
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="text-[17px] font-semibold">Example words</h2>
          <span lang="he" className="hebrew text-lg font-semibold leading-none text-muted">
            דוגמאות
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {/* English on the left, Hebrew on the right: the way each is read. The speaker is at the right end. */}
          {card.examples.map((word, i) => (
            <div key={word.translit} className={`flex items-center gap-3 py-2 pl-3.5 pr-2 ${i > 0 ? "border-t border-border" : ""}`}>
              <span className="flex-1 text-sm">
                {showTranslit && (
                  <>
                    <i className="text-muted">{word.translit}</i>
                    {" · "}
                  </>
                )}
                {word.english}
              </span>
              <span lang="he" className="hebrew text-3xl leading-snug">
                {show(word.pre)}
                <span className="font-bold text-accent">{show(word.hl)}</span>
                {show(word.post)}
              </span>
              <SpeakerButton voice={voice} clipId={wordClipId(word)} label={`Hear the word: ${word.translit}`} />
            </div>
          ))}
        </div>
      </section>

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
