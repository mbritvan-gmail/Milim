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

// "Study 4 new words", "Review 40 learned words", ...
export function studyLabel(filter: StudyFilter, count: number) {
  if (count === 0) return "Nothing to study here";
  const n = `${count}`;
  switch (filter) {
    case "new":
      return `Study ${n} new ${count === 1 ? "word" : "words"}`;
    case "learning":
      return `Study ${n} learning ${count === 1 ? "word" : "words"}`;
    case "learned":
      return `Review ${n} learned ${count === 1 ? "word" : "words"}`;
    default:
      return `Review all ${n} ${count === 1 ? "word" : "words"}`;
  }
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
  context: { songTitle: string | null; hebrew: string; transliteration: string | null } | null;
};

export type WordState = { status: WordStatus; count: number };

export type Session = {
  cards: Record<string, SessionCard>;
  queue: string[];
  total: number;
  /** Counted once per word, by its first answer in this session (repeats are extra practice). */
  stats: { got: number; again: number; known: number };
  seen: Record<string, true>;
  history: HistoryEntry[];
};

type HistoryEntry = {
  vocabId: string;
  before: WordState;
  queue: string[];
  stats: Session["stats"];
  seen: Session["seen"];
};

// How many other cards come before a card that isn't learned yet shows up again. A miss comes back
// sooner than a correct answer, but never straight away (seeing it again at once only tests short-term
// memory). When fewer cards than that are left, it simply goes to the end.
export const GAP_AFTER_MISS = 6;
export const GAP_AFTER_CORRECT = 10;

export function startSession(cards: SessionCard[]): Session {
  return {
    cards: Object.fromEntries(cards.map((c) => [c.vocabId, { ...c }])),
    queue: cards.map((c) => c.vocabId),
    total: cards.length,
    stats: { got: 0, again: 0, known: 0 },
    seen: {},
    history: [],
  };
}

// What a word's state becomes after an answer. This mirrors the database rule exactly.
export function nextState(state: WordState, kind: AnswerKind, learnAfter: number): WordState {
  if (kind === "know") return { status: "learned", count: Math.max(state.count, learnAfter) };
  if (kind === "got") {
    if (state.status === "learned") return state;
    const count = state.count + 1;
    return count >= learnAfter ? { status: "learned", count } : { status: "learning", count };
  }
  // "Still learning": a learned word goes back to Learning with progress cleared.
  if (state.status === "learned") return { status: "learning", count: 0 };
  return { status: "learning", count: state.count };
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
  const before: WordState = { status: card.status, count: card.count };
  const after = nextState(before, kind, learnAfter);

  const queue = session.queue.slice(1);
  if (after.status !== "learned") {
    const gap = kind === "again" ? GAP_AFTER_MISS : GAP_AFTER_CORRECT;
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
      history: [...session.history, { vocabId: id, before, queue: session.queue, stats: session.stats, seen: session.seen }],
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
