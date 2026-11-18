import { AIError, type AIProvider } from "./ai/types";
import { isPointedVersion } from "./nikud";

export type PointResult = {
  /** The pointed text for each input, or null where Claude's answer was never accepted. */
  answers: (string | null)[];
  usage: { input: number; output: number };
  /** The last problem seen, for an error message when nothing was accepted. */
  lastError: string;
};

// Asks Claude to add nikud to each text. An answer is only accepted if it is the same text with vowel marks
// added (see isPointedVersion); anything else is asked for again, up to three tries in all.
export async function pointAll(ai: AIProvider, texts: string[]): Promise<PointResult> {
  const answers: (string | null)[] = texts.map(() => null);
  const usage = { input: 0, output: 0 };
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const todo = answers.map((a, i) => (a === null ? i : -1)).filter((i) => i >= 0);
    if (todo.length === 0) break;
    try {
      const got = await ai.addNikud({
        texts: todo.map((i) => texts[i]),
        onUsage: (u) => {
          usage.input += u.input;
          usage.output += u.output;
        },
      });
      todo.forEach((i, k) => {
        if (isPointedVersion(texts[i], got[k])) answers[i] = got[k].trim();
      });
    } catch (error) {
      lastError = error instanceof AIError ? error.message : "The AI service had a problem adding nikud.";
    }
  }
  return { answers, usage, lastError };
}
