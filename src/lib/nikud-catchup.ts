// Rules for the automatic nikud catch-up on a song page: one attempt per song, per day, per device.
// The attempt itself (at most three tries, 45 seconds) is the server's `addNikud`; this file only
// decides whether today's attempt has already been used. Kept free of React so it can be tested.

export type KeyValueStore = { getItem(key: string): string | null; setItem(key: string, value: string): void };

const PREFIX = "milim-nikud-catchup:";

// A calendar day on this device, e.g. "2026-11-18".
export function dayKey(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// True if this device has not tried this song today; in that case today's try is recorded straight
// away, so a reload, a second tab or a re-render can never start a second one. If the device can't
// remember anything (private browsing, blocked storage) it answers false: no memory, no automatic tries.
export function claimTodaysAttempt(store: KeyValueStore | null, songId: string, now: Date): boolean {
  if (!store) return false;
  try {
    const key = PREFIX + songId;
    const today = dayKey(now);
    if (store.getItem(key) === today) return false;
    store.setItem(key, today);
    // Reading it back proves the write stuck; otherwise we could try again on every visit.
    return store.getItem(key) === today;
  } catch {
    return false;
  }
}

// Which texts on a song still lack nikud, as a yes/no for the page.
export function songNeedsNikud(args: {
  lines: { hebrew: string; vocalized?: string | null }[];
  words: { vocalized?: string | null }[];
  isSkippable: (hebrew: string) => boolean;
}): boolean {
  return args.lines.some((l) => !l.vocalized && !args.isSkippable(l.hebrew)) || args.words.some((w) => !w.vocalized);
}
