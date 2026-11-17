import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ConjugationSchema, looksComplete } from "../conjugation";
import { AdjectiveSchema, NounSchema, adjectiveLooksComplete, nounLooksComplete, type WordForms } from "../word-forms";
import {
  AIError,
  type AIProvider,
  type AnalyzeLyricsInput,
  type AnalyzedLine,
  type AnalyzedWord,
  type ConjugateInput,
  type ConjugationData,
  type InflectInput,
  type DefineWordInput,
  type DefineWordResult,
  type DistractorInput,
  type LyricsAnalysis,
} from "./types";

// Small chunks run in parallel, so a long song takes about as long as one short one.
// Words that are never worth a place in the song vocabulary, whatever the AI says: loose one-letter
// prefixes and the word "shel" (of). Pronouns, prepositions and conjunctions are kept.
const SKIP_LEMMAS = new Set(["של"]);
export function isSkippableLemma(lemma: string) {
  const bare = lemma.trim().replace(/[\u0591-\u05C7]/g, ""); // ignore vowel marks
  return bare.length <= 1 || SKIP_LEMMAS.has(bare);
}

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

const CONJUGATE_PROMPT = `You are a careful Hebrew grammarian helping English speakers learn verb conjugation.

Given a Hebrew verb (any form) and its English meaning, work out its root and binyan, then give every present, past and future form of the same verb. Each form is split into colored segments so a learner sees the pattern:
- "prefix": the part that says who (future only: א, ת, י, נ).
- "stem": the verb itself.
- "suffix": the part that says number or gender (past endings like תי, ת, נו, תם, ה, ו; future endings like י and ו; present endings like ת, ים, ות).
Every segment has "plain" (letters only, standard unpointed spelling as in modern Hebrew with matres lectionis, e.g. כותב and יכתוב), "vocalized" (the same letters with full nikud) and "translit" (English pronunciation, e.g. "khtov", "katav"). Concatenating the plain segments must give the plain word; concatenating the vocalized segments must give the pointed word; the translit segments must read as the whole word when joined.
Rules:
- A shva on the last letter of the stem belongs to the stem segment, not to the suffix.
- Where the stem changes shape (katav / katv / ktav), keep the changed stem in the stem segment.
- "infinitive": the infinitive with ל (e.g. לכתוב).
- present: exactly four forms: ms (masculine singular), fs (feminine singular), mp (masculine plural), fp (feminine plural), each with a gender of m or f.
- past and future: seven persons: i, you, he, she, we, you_pl, they. Each is a list of forms. If masculine and feminine differ, give two forms (gender "m" and "f"); where they match give one form with gender "mf". For "i", "we", "you_pl" and "they" give one form with gender "mf" (use the masculine plural for "you_pl" and "they"; leave out formal feminine plural forms). For "you" give m and f (they differ in nikud in the past even when spelled the same). "he" has gender "m" and "she" gender "f".
- Keep the same verb as given. Use standard modern Hebrew. Do not add commentary.

Example (the verb "to write", Pa'al): past I = stem כָּתַבְ + suffix תִּי (katav + ti); past you m = stem כָּתַבְ + suffix תָּ (katav + ta), you f = כָּתַבְ + תְּ (katav + t); past she = stem כָּתְבָ + suffix ה (katv + a); future I = prefix אֶ + stem כְתֹּב (e + khtov), plain stem כתוב; future you f = prefix תִּ + stem כְתְּבִ + suffix י (ti + khtev + i), plain stem כתב; present ms = stem כּוֹתֵב (kotev), fs = stem כּוֹתֶבֶ + suffix ת (kotev + et), mp = כּוֹתְבִ + ים (kotv + im), fp = כּוֹתְב + וֹת (kotv + ot).`;

const FORMS_COMMON = `Every form is split into colored segments so a learner sees the pattern: "stem" (the word itself) and "suffix" (the ending that shows number or gender). Every segment has "plain" (letters only, standard unpointed modern spelling, e.g. שולחנות), "vocalized" (the same letters with full nikud) and "translit" (English pronunciation). Concatenating the plain segments must give the plain word, the vocalized segments the pointed word, and the translit segments must read as the whole word. If the last letter of the stem is a final letter (ן ם ך ף ץ) in the base form but sits in the middle of the longer form, write the regular letter in that form's stem (שולחנ + ות). Use standard modern Hebrew and no commentary.`;

const NOUN_PROMPT = `You are a careful Hebrew grammarian helping English speakers learn vocabulary.

Given a Hebrew noun (it may be given in any form) and its English meaning, give its grammatical gender ("masculine" or "feminine"), its singular and its plural.
${FORMS_COMMON}
- "singular" and "plural" are lists of segments. Use the standard plural, including irregular ones (e.g. שולחן / שולחנות, אב / אבות, עיר / ערים).
- "note": one short plain-English sentence only when the plural is irregular or surprising (for example a masculine noun with the "feminine" plural ending ות, or a stem that changes). Otherwise an empty string.`;

const ADJECTIVE_PROMPT = `You are a careful Hebrew grammarian helping English speakers learn vocabulary.

Given a Hebrew adjective (it may be given in any form) and its English meaning, give its four forms: ms (masculine singular), fs (feminine singular), mp (masculine plural), fp (feminine plural).
${FORMS_COMMON}
- "note": one short plain-English sentence only if one of the forms is irregular. Otherwise an empty string.`;

const DefineSchema = z.object({
  lemma: z.string(),
  transliteration: z.string(),
  english: z.string(),
  part_of_speech: z.string(),
});

const DEFINE_PROMPT = `You help English speakers learn Hebrew through song lyrics.

You receive one Hebrew word exactly as it appears in a lyric line, and the whole line. Say how the word should be entered in a vocabulary list:
- "lemma": the dictionary form in Hebrew letters without vowel marks (nikud). Verbs in the infinitive (for example "לאהוב"), nouns in the singular, adjectives in the masculine singular. If the word has a one-letter prefix attached (such as the ל in לסרט, meaning "to the movie"), give the base word (סרט).
- "transliteration": an easy-to-read Latin-letter pronunciation of the lemma.
- "english": a short gloss (one to three words) that fits the meaning in this line. For verbs write the English infinitive with "to" (for example "to love").
- "part_of_speech": one of noun, verb, adjective, adverb, preposition, pronoun, conjunction, expression.`;

const DISTRACTOR_CHUNK = 30;

const SYSTEM_PROMPT = `You help English speakers learn Hebrew through song lyrics.

You receive numbered Hebrew lyric lines. For each line produce:
- "transliteration": an easy-to-read Latin-letter pronunciation (for example "shalom aleichem"), written the way a beginner would read it.
- "english": a natural, faithful English translation of that line. Keep the poetic meaning, but stay close to the Hebrew so a learner can map words to meaning. Translate each line on its own line number; never merge or skip lines.

Also choose the key vocabulary a learner needs to understand the song:
- Include every word a learner needs: nouns, verbs, adjectives, adverbs, useful expressions, and also pronouns (אני, אתה, את meaning "you" to a woman, הוא, היא, אנחנו, הם, זה), prepositions, conjunctions, and words like לא and כן. Beginners need those words too.
- Skip only pure grammar markers that have no meaning of their own: the object marker את (pronounced "et"; do not confuse it with את meaning "you", pronounced "at", which you should include), the word של ("of"), and the one-letter prefixes ה ו ב ל מ כ ש when they are attached to another word.
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
      .filter((w) => w.lemma.trim() && w.english.trim() && !isSkippableLemma(w.lemma))
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

  async defineWord({ word, line, title }: DefineWordInput): Promise<DefineWordResult> {
    const signal = AbortSignal.timeout(30_000);
    try {
      const response = await this.client.messages.parse(
        {
          model: this.model,
          max_tokens: 600,
          system: DEFINE_PROMPT,
          messages: [
            {
              role: "user",
              content: `${title ? `Song title: ${title}\n` : ""}Word: ${word}\nLine: ${line}`,
            },
          ],
          output_config: { effort: "low", format: zodOutputFormat(DefineSchema) },
        },
        { signal },
      );
      if (response.stop_reason === "refusal" || !response.parsed_output) {
        throw new AIError("Claude couldn't look that word up.");
      }
      const r = response.parsed_output;
      return {
        lemma: r.lemma.trim(),
        transliteration: r.transliteration.trim(),
        english: r.english.trim(),
        part_of_speech: r.part_of_speech.trim(),
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      if (signal.aborted || error instanceof Anthropic.APIUserAbortError) {
        throw new AIError("Looking up that word took too long. Please try again.");
      }
      throw new AIError("The AI service had a problem looking up that word. Please try again.");
    }
  }

  async conjugateVerb({ lemma, english }: ConjugateInput): Promise<ConjugationData> {
    const signal = AbortSignal.timeout(50_000);
    try {
      const response = await this.client.messages.parse(
        {
          model: this.model,
          max_tokens: 8000,
          system: CONJUGATE_PROMPT,
          messages: [{ role: "user", content: `Verb: ${lemma}\nMeaning: ${english}` }],
          output_config: { effort: "medium", format: zodOutputFormat(ConjugationSchema) },
        },
        { signal },
      );
      if (response.stop_reason === "refusal" || !response.parsed_output) {
        throw new AIError("Claude couldn't conjugate that verb.");
      }
      if (!looksComplete(response.parsed_output)) {
        throw new AIError("Claude's answer was incomplete. Please try again.");
      }
      return response.parsed_output;
    } catch (error) {
      if (error instanceof AIError) throw error;
      if (signal.aborted || error instanceof Anthropic.APIUserAbortError) {
        throw new AIError("Conjugating took too long. Please try again.");
      }
      throw new AIError("The AI service had a problem conjugating that verb. Please try again.");
    }
  }

  async inflectWord({ lemma, english, kind }: InflectInput): Promise<WordForms> {
    const signal = AbortSignal.timeout(40_000);
    try {
      const noun = kind === "noun";
      const response = await this.client.messages.parse(
        {
          model: this.model,
          max_tokens: 3000,
          system: noun ? NOUN_PROMPT : ADJECTIVE_PROMPT,
          messages: [{ role: "user", content: `Word: ${lemma}\nMeaning: ${english}` }],
          output_config: { effort: "low", format: zodOutputFormat(noun ? NounSchema : AdjectiveSchema) },
        },
        { signal },
      );
      if (response.stop_reason === "refusal" || !response.parsed_output) {
        throw new AIError("Claude couldn't work out the forms of that word.");
      }
      const result: WordForms = noun
        ? { kind: "noun", data: response.parsed_output as z.infer<typeof NounSchema> }
        : { kind: "adjective", data: response.parsed_output as z.infer<typeof AdjectiveSchema> };
      const complete = result.kind === "noun" ? nounLooksComplete(result.data) : result.kind === "adjective" ? adjectiveLooksComplete(result.data) : false;
      if (!complete) throw new AIError("Claude's answer was incomplete. Please try again.");
      return result;
    } catch (error) {
      if (error instanceof AIError) throw error;
      if (signal.aborted || error instanceof Anthropic.APIUserAbortError) {
        throw new AIError("That took too long. Please try again.");
      }
      throw new AIError("The AI service had a problem with that word. Please try again.");
    }
  }
}
