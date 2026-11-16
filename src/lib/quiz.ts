export const QUIZ_SIZE = 15;
export const OPTIONS_PER_QUESTION = 4;

export function shuffle<T>(items: T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.trim().toLowerCase();

export function sameAnswer(a: string, b: string) {
  return norm(a) === norm(b);
}

// Build the answer choices for one question: the correct answer plus up to three wrong
// ones. Wrong answers come from the AI-written distractors first, then from a pool of
// other English words. Duplicates (ignoring case) and the correct answer are never repeated.
export function buildOptions(
  correct: string,
  distractors: string[],
  pool: string[],
  rand: () => number = Math.random,
): string[] {
  const seen = new Set([norm(correct)]);
  const wrong: string[] = [];
  const take = (candidates: string[]) => {
    for (const c of candidates) {
      const key = norm(c);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      wrong.push(c.trim());
      if (wrong.length >= OPTIONS_PER_QUESTION - 1) return;
    }
  };
  take(distractors);
  if (wrong.length < OPTIONS_PER_QUESTION - 1) take(shuffle(pool, rand));
  return shuffle([correct.trim(), ...wrong], rand);
}

// Choose which words to quiz: words the user hasn't learned yet come first.
export function pickQuizWords<T extends { learned: boolean }>(
  words: T[],
  size: number = QUIZ_SIZE,
  rand: () => number = Math.random,
): T[] {
  const fresh = shuffle(words.filter((w) => !w.learned), rand);
  const known = shuffle(words.filter((w) => w.learned), rand);
  return [...fresh, ...known].slice(0, size);
}
