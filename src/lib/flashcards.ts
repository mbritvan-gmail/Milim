import { shuffle } from "./quiz";

// The current time, kept in a helper so pages stay tidy (and tests can ignore it).
export function currentTimeMs() {
  return Date.now();
}

export const SESSION_SIZE = 20;
export const MAX_NEW_PER_SESSION = 10;
export const SONG_SESSION_SIZE = 30;

// A row of the user's Master Dictionary (the master_dictionary view).
export type DictionaryStatus = "new" | "learning" | "learned";
export type DictionaryRow = { status: DictionaryStatus; next_due_at: string | null };

export function isDue(row: DictionaryRow, nowMs: number) {
  return row.status !== "new" && row.next_due_at !== null && Date.parse(row.next_due_at) <= nowMs;
}

export function countDue(rows: DictionaryRow[], nowMs: number) {
  return rows.filter((r) => isDue(r, nowMs)).length;
}

// The everyday session: words that are due for review (most overdue first), then a few
// brand-new words to introduce.
export function selectDueSession<T extends DictionaryRow>(
  rows: T[],
  nowMs: number,
  rand: () => number = Math.random,
): T[] {
  const due = rows
    .filter((r) => isDue(r, nowMs))
    .sort((a, b) => Date.parse(a.next_due_at!) - Date.parse(b.next_due_at!))
    .slice(0, SESSION_SIZE);
  const room = Math.min(MAX_NEW_PER_SESSION, SESSION_SIZE - due.length);
  const fresh = room > 0 ? shuffle(rows.filter((r) => r.status === "new"), rand).slice(0, room) : [];
  return [...due, ...fresh];
}

// "Practice anything": a random handful, ignoring due dates (for words you already know too).
export function selectAny<T>(rows: T[], size: number = SESSION_SIZE, rand: () => number = Math.random): T[] {
  return shuffle(rows, rand).slice(0, size);
}
