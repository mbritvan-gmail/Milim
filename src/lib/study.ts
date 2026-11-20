import { shuffle } from "./quiz";

// ---------------------------------------------------------------------------
// Word status: New (never answered), Learning, Learned. The same words are used on the
// Dictionary, the study cards and the song page.
// ---------------------------------------------------------------------------
export type WordStatus = "new" | "learning" | "learned";
export type StudyFilter = "new" | "learning" | "learned" | "all";
export type Direction = "he-en" | "en-he" | "mixed";

export const STUDY_FILTERS: StudyFilter[] = ["new", "learning", "learned", "all"];
export const DIRECTIONS: Direction[] = ["he-en", "en-he", "mixed"];

export function isStudyFilter(value: unknown): value is StudyFilter {
  return typeof value === "string" && (STUDY_FILTERS as string[]).includes(value);
}
export function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && (DIRECTIONS as string[]).includes(value);
}

export function matchesFilter(status: WordStatus, filter: StudyFilter) {
  return filter === "all" || status === filter;
}

// "Learning · 1/2", "Learned", "New". Progress never shows as full while still learning.
export function statusText(status: WordStatus, count: number, learnAfter: number) {
  if (status === "learned") return "Learned";
  if (status === "new") return "New";
  return `Learning · ${Math.min(count, learnAfter - 1)}/${learnAfter}`;
}

// ---------------------------------------------------------------------------
// A study session: a queue of cards. "Got it" counts toward Learned; a word that isn't
// Learned yet comes back a few cards later, so the session ends when everything in it is
// learned (or the person leaves, since every answer is saved as it is given).
// ---------------------------------------------------------------------------
export type AnswerKind = "got" | "again" | "know";

export type SessionCard = {
  vocabId: string;
  lemma: string;
  transliteration: string | null;
  english: string;
  partOfSpeech: string | null;
  /** Optional details some words have (nikud, gender, plural). */
  vocalized?: string | null;
  gender?: string | null;
  plural?: string | null;
  status: WordStatus;
  /** Correct answers so far (what the database holds). */
  count: number;
  /** How many times the person has missed it lately (what the database holds): it makes the word come up earlier. */
  misses: number;
  context: { songTitle: string | null; hebrew: string; transliteration: string | null } | null;
};

export type WordState = { status: WordStatus; count: number; misses: number };

export type Session = {
  cards: Record<string, SessionCard>;
  queue: string[];
  total: number;
  /** Counted once per word, by its first answer in this session (repeats are extra practice). */
  stats: { got: number; again: number; known: number };
  seen: Record<string, true>;
  /** Misses so far in this session, per word: the more a word is missed, the sooner it comes back. */
  missed: Record<string, number>;
  /** Correct answers in a row so far in this session, per word: the longer the run, the longer it waits. */
  streak: Record<string, number>;
  history: HistoryEntry[];
};

type HistoryEntry = {
  vocabId: string;
  before: WordState;
  queue: string[];
  stats: Session["stats"];
  seen: Session["seen"];
  missed: Session["missed"];
  streak: Session["streak"];
};

// How many other cards come before a card that isn't learned yet shows up again. It never comes back
// straight away (seeing it again at once only tests short-term memory). The gap shrinks when a word is
// missed again and again, and grows each time it is answered right in a row, so easy words wait longer and
// hard ones come back sooner. When fewer cards than the gap are left, it simply goes to the end.
const MISS_GAPS = [5, 4, 3]; // after the 1st, 2nd, 3rd (and later) miss of a word in this session
const CORRECT_GAP = 10; // per correct answer in a row, for a word not missed in this session
const CORRECT_GAP_AFTER_MISS = 6; // the same, for a word that was missed in this session
const MAX_GAP = 30;

export function gapAfterMiss(missesSoFar: number): number {
  return MISS_GAPS[Math.min(Math.max(missesSoFar, 1), MISS_GAPS.length) - 1];
}
export function gapAfterCorrect(streak: number, missedBefore: boolean): number {
  return Math.min(MAX_GAP, Math.max(1, streak) * (missedBefore ? CORRECT_GAP_AFTER_MISS : CORRECT_GAP));
}

// The order cards come up in at the start of a session: random, but words the person has missed lately tend
// to come first (a weighted shuffle: a word's chance of being early rises with its misses, up to 4).
export function sessionOrder<T extends { status: WordStatus; misses: number }>(cards: T[], rand: () => number = Math.random): T[] {
  const weight = (c: T) => (c.status === "learned" ? 1 : 1 + 2 * Math.min(Math.max(c.misses, 0), 4));
  return cards
    .map((c) => ({ c, key: -Math.log(1 - rand()) / weight(c) }))
    .sort((x, y) => x.key - y.key)
    .map((x) => x.c);
}

export function startSession(cards: SessionCard[]): Session {
  return {
    cards: Object.fromEntries(cards.map((c) => [c.vocabId, { ...c }])),
    queue: cards.map((c) => c.vocabId),
    total: cards.length,
    stats: { got: 0, again: 0, known: 0 },
    seen: {},
    missed: {},
    streak: {},
    history: [],
  };
}

// What a word's state becomes after an answer. This mirrors the database rule exactly.
export function nextState(state: WordState, kind: AnswerKind, learnAfter: number): WordState {
  if (kind === "know") return { status: "learned", count: Math.max(state.count, learnAfter), misses: 0 };
  if (kind === "got") {
    if (state.status === "learned") return state;
    const count = state.count + 1;
    // Getting it right eases the miss count; learning the word clears it.
    return count >= learnAfter ? { status: "learned", count, misses: 0 } : { status: "learning", count, misses: Math.max(0, state.misses - 1) };
  }
  // "Still learning": a learned word goes back to Learning with progress cleared. Every miss is counted.
  if (state.status === "learned") return { status: "learning", count: 0, misses: state.misses + 1 };
  return { status: "learning", count: state.count, misses: state.misses + 1 };
}

export type AnswerResult = {
  session: Session;
  /** The card that was answered, with its state before the answer (for saving and undo). */
  vocabId: string;
  before: WordState;
  after: WordState;
};

export function currentCard(session: Session): SessionCard | null {
  const id = session.queue[0];
  return id ? session.cards[id] : null;
}

export function applyAnswer(session: Session, kind: AnswerKind, learnAfter: number): AnswerResult | null {
  const id = session.queue[0];
  if (!id) return null;
  const card = session.cards[id];
  const before: WordState = { status: card.status, count: card.count, misses: card.misses };
  const after = nextState(before, kind, learnAfter);

  const missed = { ...session.missed };
  const streak = { ...session.streak };
  if (kind === "again") {
    missed[id] = (missed[id] ?? 0) + 1;
    streak[id] = 0;
  } else {
    streak[id] = (streak[id] ?? 0) + 1;
  }

  const queue = session.queue.slice(1);
  if (after.status !== "learned") {
    const gap = kind === "again" ? gapAfterMiss(missed[id]) : gapAfterCorrect(streak[id], (missed[id] ?? 0) > 0);
    queue.splice(Math.min(gap, queue.length), 0, id);
  }

  const stats = { ...session.stats };
  if (!session.seen[id]) {
    if (kind === "know") stats.known++;
    else if (kind === "got") stats.got++;
    else stats.again++;
  }

  return {
    session: {
      ...session,
      cards: { ...session.cards, [id]: { ...card, ...after } },
      queue,
      stats,
      seen: { ...session.seen, [id]: true },
      missed,
      streak,
      history: [...session.history, { vocabId: id, before, queue: session.queue, stats: session.stats, seen: session.seen, missed: session.missed, streak: session.streak }],
    },
    vocabId: id,
    before,
    after,
  };
}

export type UndoResult = { session: Session; vocabId: string; restore: WordState };

export function undoLast(session: Session): UndoResult | null {
  const last = session.history[session.history.length - 1];
  if (!last) return null;
  const card = session.cards[last.vocabId];
  return {
    session: {
      ...session,
      cards: { ...session.cards, [last.vocabId]: { ...card, ...last.before } },
      queue: last.queue,
      stats: last.stats,
      seen: last.seen,
      missed: last.missed,
      streak: last.streak,
      history: session.history.slice(0, -1),
    },
    vocabId: last.vocabId,
    restore: last.before,
  };
}

export function isDone(session: Session) {
  return session.queue.length === 0;
}

// ---------------------------------------------------------------------------
// Which way round a card is shown.
// ---------------------------------------------------------------------------
export function cardDirection(direction: Direction, rand: () => number = Math.random): "he-en" | "en-he" {
  if (direction !== "mixed") return direction;
  return rand() < 0.5 ? "he-en" : "en-he";
}

// A fresh id for each time the study page is opened. The study screen keeps its progress in the
// browser, so without this it would hang on to an earlier session when you open another one.
export function newSessionId() {
  return crypto.randomUUID();
}

// A short fingerprint of some data. Screens that copy their starting data into their own memory use it as
// a `key`, so they start over (and show the new data) whenever that data changes.
export function fingerprint(parts: (string | number | boolean | null)[]): string {
  let h = 2166136261;
  const text = parts.join("\u001f");
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return `${parts.length}-${h.toString(36)}`;
}

// ---------------------------------------------------------------------------
// Small helpers for loading data in pieces (web addresses have a length limit, so a long
// list of ids is sent in chunks).
// ---------------------------------------------------------------------------
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export { shuffle };
