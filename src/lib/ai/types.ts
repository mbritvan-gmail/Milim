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

export type DistractorInput = { lemma: string; english: string; part_of_speech?: string | null };

export interface AIProvider {
  analyzeLyrics(input: AnalyzeLyricsInput): Promise<LyricsAnalysis>;
  /** Wrong-but-plausible English answers for quiz questions, aligned with the input. */
  generateDistractors(words: DistractorInput[]): Promise<string[][]>;
}

/** An error whose message is safe to show to the user. */
export class AIError extends Error {}
