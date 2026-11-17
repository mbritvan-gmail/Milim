import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  AIError,
  type AIProvider,
  type AnalyzeLyricsInput,
  type AnalyzedLine,
  type AnalyzedWord,
  type DistractorInput,
  type LyricsAnalysis,
} from "./types";

// Small chunks run in parallel, so a long song takes about as long as one short one.
const CHUNK_SIZE = 12;
// Give up a little before the hosting platform's own time limit (60s) so the user gets a
// clear message instead of a generic browser error.
const DEADLINE_MS = 50_000;

const ChunkSchema = z.object({
  lines: z.array(
    z.object({
      n: z.number().int(),
      transliteration: z.string(),
      english: z.string(),
    }),
  ),
  vocab: z.array(
    z.object({
      lemma: z.string(),
      surface_form: z.string(),
      transliteration: z.string(),
      english: z.string(),
      part_of_speech: z.string(),
      line_n: z.number().int(),
    }),
  ),
});

const DistractorSchema = z.object({
  items: z.array(z.object({ n: z.number().int(), distractors: z.array(z.string()) })),
});

const DISTRACTOR_PROMPT = `You write multiple-choice wrong answers for a Hebrew vocabulary quiz.

You receive numbered Hebrew words with their correct English meaning. For each word write exactly 3 WRONG English answers that a learner might plausibly pick:
- Same part of speech, similar length and register as the correct answer, and written in the same style (if the correct answer is "to run", wrong answers for verbs also start with "to").
- Clearly wrong: never a synonym or near-synonym of the correct answer, and never the correct answer itself.
- No two alike. Short glosses (one to three words), lower case unless a proper noun.
- Ideally real words a learner could confuse with it (similar meaning area, or a similar-sounding Hebrew word), but not so close that two answers could both be correct.`;

const DISTRACTOR_CHUNK = 30;

const SYSTEM_PROMPT = `You help English speakers learn Hebrew through song lyrics.

You receive numbered Hebrew lyric lines. For each line produce:
- "transliteration": an easy-to-read Latin-letter pronunciation (for example "shalom aleichem"), written the way a beginner would read it.
- "english": a natural, faithful English translation of that line. Keep the poetic meaning, but stay close to the Hebrew so a learner can map words to meaning. Translate each line on its own line number; never merge or skip lines.

Also choose the key vocabulary a learner needs to understand the song:
- Pick words that carry meaning (nouns, verbs, adjectives, adverbs, useful expressions). Skip words that are pure grammar (such as the object marker את, or של) unless they are essential to understanding the line.
- Choose as many or as few as the song genuinely needs; do not pad. Do not list the same word twice.
- "lemma": dictionary form in Hebrew letters without vowel marks (nikud). Verbs always in the infinitive (for example "לאהוב", never "אהב" or "אוהב"), nouns in the singular, adjectives in the masculine singular.
- "surface_form": the word exactly as it appears in the lyric, in Hebrew letters.
- "english": a short gloss (one to three words) that fits the meaning in this song. For verbs write the English infinitive with "to" (for example "to love", "to miss").
- "transliteration": pronunciation of the lemma.
- "part_of_speech": one of noun, verb, adjective, adverb, preposition, pronoun, conjunction, expression.
- "line_n": the number of the line where the word appears.

If a line mixes Hebrew with another language, focus on the Hebrew.`;

function buildUserMessage(title: string | undefined, lines: string[], offset: number) {
  const numbered = lines.map((text, i) => `${offset + i + 1}. ${text}`).join("\n");
  const heading = title ? `Song title: ${title}\n\n` : "";
  return `${heading}Lyric lines:\n${numbered}`;
}

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AIError("The AI service isn't configured yet (missing ANTHROPIC_API_KEY).");
    }
    this.client = new Anthropic({ apiKey });
    this.model = process.env.AI_MODEL || "claude-sonnet-5-5";
  }

  async analyzeLyrics({ title, lines: allLines }: AnalyzeLyricsInput): Promise<LyricsAnalysis> {
    // Choruses repeat: translate each distinct line once and reuse it for the repeats.
    // This is faster, cheaper, and keeps repeated lines perfectly consistent.
    const uniqueIndex = new Map<string, number>();
    const lines: string[] = [];
    const firstOccurrence: number[] = []; // unique index -> first position in allLines
    allLines.forEach((line, i) => {
      if (!uniqueIndex.has(line)) {
        uniqueIndex.set(line, lines.length);
        lines.push(line);
        firstOccurrence.push(i);
      }
    });

    // Process chunks in parallel to keep long songs fast.
    const chunks: { offset: number; lines: string[] }[] = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      chunks.push({ offset: i, lines: lines.slice(i, i + CHUNK_SIZE) });
    }

    const signal = AbortSignal.timeout(DEADLINE_MS);
    const results = await Promise.all(chunks.map((c) => this.analyzeChunk(title, c.lines, c.offset, signal)));

    const uniqueAnalyzed: AnalyzedLine[] = results.flatMap((r) => r.lines);
    const outLines: AnalyzedLine[] = allLines.map((line) => uniqueAnalyzed[uniqueIndex.get(line)!]);

    // Merge vocab across chunks, keeping the first entry for each word (by lemma).
    const seen = new Set<string>();
    const vocab: AnalyzedWord[] = [];
    for (const word of results.flatMap((r) => r.vocab)) {
      const key = word.lemma;
      if (!seen.has(key)) {
        seen.add(key);
        // Point the word at the first place the line appears in the full lyrics.
        vocab.push({ ...word, line_index: firstOccurrence[word.line_index] ?? word.line_index });
      }
    }
    return { lines: outLines, vocab };
  }

  private async analyzeChunk(title: string | undefined, lines: string[], offset: number, signal: AbortSignal) {
    // One retry covers an occasional malformed or incomplete reply.
    let lastError: unknown;
    const started = Date.now();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await this.callModel(title, lines, offset, signal);
        console.log(`analyzeChunk offset=${offset} lines=${lines.length} attempt=${attempt + 1} ms=${Date.now() - started}`);
        return result;
      } catch (error) {
        lastError = error;
        if (error instanceof AIError) throw error; // refusals etc.: don't retry
        if (signal.aborted || error instanceof Anthropic.APIUserAbortError) {
          console.error(`analyzeChunk offset=${offset} timed out after ${Date.now() - started}ms`);
          throw new AIError(
            "This song is taking too long to translate. Try again, or add it in smaller parts (about 30 lines at a time).",
          );
        }
      }
    }
    console.error(`analyzeChunk offset=${offset} failed`, lastError);
    if (lastError instanceof Anthropic.APIError) {
      throw new AIError(`The AI service had a problem (${lastError.status ?? "network"}). Please try again.`);
    }
    throw new AIError("The AI returned an unexpected answer. Please try again.");
  }

  private async callModel(title: string | undefined, lines: string[], offset: number, signal: AbortSignal) {
    const response = await this.client.messages.parse(
      {
        model: this.model,
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage(title, lines, offset) }],
        output_config: {
          effort: "medium",
          format: zodOutputFormat(ChunkSchema),
        },
      },
      { signal },
    );

    if (response.stop_reason === "refusal") {
      throw new AIError("The AI couldn't process these lyrics. Try different lyrics or fewer lines.");
    }
    const parsed = response.parsed_output;
    if (!parsed) throw new Error("No parsed output");

    // The model must return exactly one entry per input line, by number.
    const byNumber = new Map(parsed.lines.map((l) => [l.n, l]));
    const outLines: AnalyzedLine[] = lines.map((hebrew, i) => {
      const entry = byNumber.get(offset + i + 1);
      if (!entry) throw new Error(`Missing line ${offset + i + 1}`);
      return { hebrew, transliteration: entry.transliteration.trim(), english: entry.english.trim() };
    });

    const vocab: AnalyzedWord[] = parsed.vocab
      .filter((w) => w.lemma.trim() && w.english.trim())
      .map((w) => ({
        lemma: w.lemma.trim(),
        surface_form: w.surface_form.trim() || w.lemma.trim(),
        transliteration: w.transliteration.trim(),
        english: w.english.trim(),
        part_of_speech: w.part_of_speech.trim(),
        // Convert the model's 1-based global line number to a 0-based global index,
        // clamped into the range of lines this chunk covered.
        line_index: Math.min(Math.max(w.line_n - 1, offset), offset + lines.length - 1),
      }));

    return { lines: outLines, vocab };
  }

  async generateDistractors(words: DistractorInput[]): Promise<string[][]> {
    const signal = AbortSignal.timeout(DEADLINE_MS);
    const out: string[][] = words.map(() => []);

    const jobs: Promise<void>[] = [];
    for (let start = 0; start < words.length; start += DISTRACTOR_CHUNK) {
      const slice = words.slice(start, start + DISTRACTOR_CHUNK);
      jobs.push(
        (async () => {
          const listing = slice
            .map((w, i) => `${i + 1}. ${w.lemma}${w.part_of_speech ? ` (${w.part_of_speech})` : ""} = ${w.english}`)
            .join("\n");
          try {
            const response = await this.client.messages.parse(
              {
                model: this.model,
                max_tokens: 4000,
                system: DISTRACTOR_PROMPT,
                messages: [{ role: "user", content: `Words:\n${listing}` }],
                output_config: { effort: "low", format: zodOutputFormat(DistractorSchema) },
              },
              { signal },
            );
            if (response.stop_reason === "refusal" || !response.parsed_output) {
              throw new AIError("The AI couldn't write quiz answers.");
            }
            for (const item of response.parsed_output.items) {
              const idx = start + item.n - 1;
              if (idx >= start && idx < start + slice.length) out[idx] = item.distractors;
            }
          } catch (error) {
            if (error instanceof AIError) throw error;
            if (signal.aborted || error instanceof Anthropic.APIUserAbortError) {
              throw new AIError("Preparing the quiz took too long.");
            }
            throw new AIError("The AI service had a problem preparing the quiz.");
          }
        })(),
      );
    }
    await Promise.all(jobs);
    return out;
  }
}
