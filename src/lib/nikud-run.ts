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
// added (see isPointedVersion); anything else is asked for again, up to three tries in all, within `budgetMs`
// so a slow answer can never run a request past its time limit.
export async function pointAll(ai: AIProvider, texts: string[], budgetMs = 45_000): Promise<PointResult> {
  const deadline = Date.now() + budgetMs;
  const answers: (string | null)[] = texts.map(() => null);
  const usage = { input: 0, output: 0 };
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const todo = answers.map((a, i) => (a === null ? i : -1)).filter((i) => i >= 0);
    if (todo.length === 0) break;
    const remaining = deadline - Date.now();
    if (remaining < 4_000) {
      lastError ||= "That took too long.";
      break;
    }
    try {
      const got = await ai.addNikud({
        texts: todo.map((i) => texts[i]),
        timeoutMs: remaining,
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
