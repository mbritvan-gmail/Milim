"use client";

import { useState, useSyncExternalStore } from "react";
import { applyTheme, readTheme, THEME_EVENT, type ThemeChoice } from "@/lib/theme";
import { saveSettings, type SettingsChange } from "./actions";
import type { Direction } from "@/lib/study";
import type { LyricsSize } from "@/lib/settings";
import { ConjugateAll } from "./conjugate-all";

const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: "he-en", label: "Hebrew → English" },
  { id: "en-he", label: "English → Hebrew" },
  { id: "mixed", label: "Mixed" },
];

function Segment<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${value === o.id ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:bg-surface-2"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Says which parts of the app a section affects.
function AppliesTo({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-normal normal-case tracking-normal text-muted">{children}</span>;
}

const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

function subscribeTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

export function SettingsForm({
  initialLearnAfter,
  initialDirection,
  initialShowTranslit,
  initialShowNikud,
  initialPreferredPlayer,
  initialLyricsSize,
  email,
}: {
  initialLearnAfter: number;
  initialDirection: Direction;
  initialShowTranslit: boolean;
  initialShowNikud: boolean;
  initialPreferredPlayer: "spotify" | "youtube";
  initialLyricsSize: LyricsSize;
  email: string;
}) {
  const [learnAfter, setLearnAfter] = useState(initialLearnAfter);
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [showTranslit, setShowTranslit] = useState(initialShowTranslit);
  const [showNikud, setShowNikud] = useState(initialShowNikud);
  const [player, setPlayer] = useState(initialPreferredPlayer);
  const [lyricsSize, setLyricsSize] = useState(initialLyricsSize);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "dark" as ThemeChoice);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Each change saves straight away; if saving fails the control goes back to what it was.
  async function change(change: SettingsChange, revert: () => void) {
    setMessage(null);
    const error = await saveSettings(change).catch(() => "Couldn't save that. Please try again.");
    if (error) {
      revert();
      setMessage({ kind: "error", text: error });
    } else {
      setMessage({ kind: "ok", text: "Saved" });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          Appearance <AppliesTo>Whole app</AppliesTo>
        </h2>
        <div className="flex flex-col gap-2">
          <p className="font-medium">Theme</p>
          <Segment label="Theme" options={THEMES} value={theme} onChange={applyTheme} />
          <p className="text-xs text-muted">System follows your phone&apos;s light or dark setting. Saved on this device.</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          Flash Cards <AppliesTo>Flash Cards only</AppliesTo>
        </h2>
        <div className="flex flex-col gap-2">
          <p className="font-medium">Study direction</p>
          <Segment
            label="Study direction"
            options={DIRECTIONS}
            value={direction}
            onChange={(d) => {
              const before = direction;
              setDirection(d);
              void change({ direction: d }, () => setDirection(before));
            }}
          />
          <p className="text-xs text-muted">Which side a flashcard starts on. You can still switch it during a session.</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          Learning <AppliesTo>Flash Cards and quizzes</AppliesTo>
        </h2>
        <div className="flex flex-col gap-2">
          <p className="font-medium">Correct answers to learn a word</p>
          <Segment
            label="Correct answers to learn a word"
            options={[1, 2, 3].map((n) => ({ id: n, label: String(n) }))}
            value={learnAfter}
            onChange={(n) => {
              const before = learnAfter;
              setLearnAfter(n);
              void change({ learnAfter: n }, () => setLearnAfter(before));
            }}
          />
          <p className="text-xs text-muted">
            Answers from flashcards and quizzes both count. A word you miss after learning it goes back to Learning.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          Player <AppliesTo>Song pages</AppliesTo>
        </h2>
        <div className="flex flex-col gap-2">
          <p className="font-medium">Preferred player</p>
          <Segment
            label="Preferred player"
            options={[
              { id: "spotify", label: "Spotify" },
              { id: "youtube", label: "YouTube" },
            ]}
            value={player}
            onChange={(p) => {
              const before = player;
              setPlayer(p);
              void change({ preferredPlayer: p }, () => setPlayer(before));
            }}
          />
          <p className="text-xs text-muted">
            The player a song page opens with. Choose Spotify if you&apos;re logged in to Spotify in this browser: Premium listeners hear the full song, others
            hear a 30-second preview. A song with only one link uses that one, and you can switch players on a song page when it has both.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          Display <AppliesTo>Whole app</AppliesTo>
        </h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Show pronunciation</p>
            <p className="text-xs text-muted">
              The English spelling of Hebrew words, on song pages, in lists and on the back of flashcards. It never shows on
              the front of a Hebrew flashcard.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showTranslit}
            aria-label="Show pronunciation"
            onClick={() => {
              const next = !showTranslit;
              setShowTranslit(next);
              void change({ showTranslit: next }, () => setShowTranslit(!next));
            }}
            className={`h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${showTranslit ? "bg-accent" : "bg-border"}`}
          >
            <span className={`block h-6 w-6 rounded-full bg-background transition-transform ${showTranslit ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <div>
            <p className="font-medium">Show nikud</p>
            <p className="text-xs text-muted">The vowel marks under Hebrew letters. Off shows plain letters. Used in conjugations and word forms.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showNikud}
            aria-label="Show nikud"
            onClick={() => {
              const next = !showNikud;
              setShowNikud(next);
              void change({ showNikud: next }, () => setShowNikud(!next));
            }}
            className={`h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${showNikud ? "bg-accent" : "bg-border"}`}
          >
            <span className={`block h-6 w-6 rounded-full bg-background transition-transform ${showNikud ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="font-medium">Lyrics size</p>
          <Segment
            label="Lyrics size"
            options={[
              { id: "small", label: "Small" },
              { id: "medium", label: "Medium" },
              { id: "large", label: "Large" },
            ]}
            value={lyricsSize}
            onChange={(sz) => {
              const before = lyricsSize;
              setLyricsSize(sz);
              void change({ lyricsSize: sz }, () => setLyricsSize(before));
            }}
          />
          <p className="text-xs text-muted">How big the lyrics are on a song page. Smaller shows more lines at once.</p>
        </div>
      </section>

      <ConjugateAll />

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Account</h2>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-medium">{email}</p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-surface-2">
              Sign out
            </button>
          </form>
        </div>
      </section>

      <p
        role="status"
        className={`h-5 text-center text-sm ${message?.kind === "error" ? "text-danger" : "text-success"}`}
      >
        {message?.text ?? ""}
      </p>
    </div>
  );
}
