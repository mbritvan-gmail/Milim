// Provider-neutral types for the AI layer. Any model provider (Claude, OpenAI,
// Gemini, ...) can be plugged in by implementing AIProvider.

export type AnalyzedLine = {
  /** Original Hebrew line (never rewritten by the model). */
  hebrew: string;
  transliteration: string;
  english: string;
};

export type AnalyzedWord = {
  /** Dictionary form, no vowel marks. */
  lemma: string;
  /** The form as it appears in the lyric. */
  surface_form: string;
  transliteration: string;
  /** Short gloss, 1-3 words, meaning in context. */
  english: string;
  part_of_speech: string;
  /** 0-based index into `lines` of the line where the word appears. */
  line_index: number;
};

export type LyricsAnalysis = {
  lines: AnalyzedLine[];
  vocab: AnalyzedWord[];
};

export type AnalyzeLyricsInput = {
  title?: string;
  /** Non-empty Hebrew lyric lines, in order. */
  lines: string[];
};

export type DefineWordInput = { word: string; line: string; title?: string };
export type DefineWordResult = { lemma: string; transliteration: string; english: string; part_of_speech: string };

import type { ConjugationData } from "../conjugation";
export type ConjugateInput = { lemma: string; english: string };
export type { ConjugationData };
import type { WordForms } from "../word-forms";
export type InflectInput = { lemma: string; english: string; kind: "noun" | "adjective" };
export type { WordForms };
import type { ModuleWordResult } from "../modules";
export type AddNikudInput = { texts: string[] };
export type DefineWordsInput = { title: string; words: string[] };
export type { ModuleWordResult };

export type DistractorInput = { lemma: string; english: string; part_of_speech?: string | null };

export interface AIProvider {
  analyzeLyrics(input: AnalyzeLyricsInput): Promise<LyricsAnalysis>;
  /** How a tapped word should be entered in a song's vocabulary (dictionary form, meaning, ...). */
  defineWord(input: DefineWordInput): Promise<DefineWordResult>;
  /** All present, past and future forms of a verb, split into prefix / stem / suffix segments. */
  conjugateVerb(input: ConjugateInput): Promise<ConjugationData>;
  /** Each Hebrew text with nikud (vowel marks) added, in the same order. */
  addNikud(input: AddNikudInput): Promise<string[]>;
  /** Meaning, pronunciation, nikud, gender and plural for each word of a pasted vocabulary list. */
  defineWords(input: DefineWordsInput): Promise<ModuleWordResult[]>;
  /** Singular / plural of a noun, or the four forms of an adjective, split into stem and ending. */
  inflectWord(input: InflectInput): Promise<WordForms>;
  /** Wrong-but-plausible English answers for quiz questions, aligned with the input. */
  generateDistractors(words: DistractorInput[]): Promise<string[][]>;
}

/** An error whose message is safe to show to the user. */
export class AIError extends Error {}
