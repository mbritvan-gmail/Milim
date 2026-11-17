// Shared pieces for editing a song: limits, helpers for tapping words in a lyric line, how a
// suggestion is stored, and the shape of every editing action (so screens can be tested with
// stand-ins).

export const MAX_ENGLISH = 500;
export const MAX_TRANSLIT = 300;
export const MAX_HEBREW = 300;
export const MAX_TITLE = 120;
export const MAX_NOTE = 200;
export const MAX_PENDING_SUGGESTIONS = 10;

// Strip quotes and punctuation from the ends of a word (but keep an apostrophe inside it).
const EDGE = /^[\s"'“”‘’()[\]{}.,;:!?\-–—…]+|[\s"'“”‘’()[\]{}.,;:!?\-–—…]+$/g;
export function cleanToken(text: string): string {
  return text.replace(EDGE, "");
}

// Splits a Hebrew line into the pieces shown on screen. `token` is what gets looked up when a
// piece is tapped (empty when the piece is only punctuation).
export function splitTokens(line: string): { text: string; token: string }[] {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({ text, token: cleanToken(text) }));
}

// A suggestion keeps its optional note alongside the proposed English, in one text field.
export type SuggestionPayload = { text: string; note: string };
export function encodeSuggestion(text: string, note: string): string {
  return JSON.stringify({ text, note });
}
export function decodeSuggestion(value: string | null | undefined): SuggestionPayload {
  if (!value) return { text: "", note: "" };
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && "text" in parsed && typeof (parsed as { text: unknown }).text === "string") {
      const p = parsed as { text: string; note?: unknown };
      return { text: p.text, note: typeof p.note === "string" ? p.note : "" };
    }
  } catch {
    // Not JSON: treat the whole value as the proposed text.
  }
  return { text: value, note: "" };
}

// ---------------------------------------------------------------------------
// Data shapes shared by the screens and the actions
// ---------------------------------------------------------------------------
export type LineFields = { english: string; transliteration: string; hebrew: string };
export type VocabDraft = { lemma: string; transliteration: string; english: string; partOfSpeech: string };
export type VocabRestore = { vocabId: string; surfaceForm: string; lineId: string | null; source: string };
export type SongDetails = { title: string; artist: string; mediaUrl: string };
export type AddedWord = {
  vocabId: string;
  lemma: string;
  transliteration: string | null;
  english: string;
  partOfSpeech: string | null;
  surfaceForm: string;
  lineId: string | null;
  status: "new" | "learning" | "learned";
  count: number;
};
export type PendingSuggestion = { id: string; lineId: string; by: string; text: string; note: string };

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export type EditActions = {
  updateLine(songId: string, lineId: string, fields: LineFields): Promise<ActionResult<{ previous: LineFields }>>;
  suggestWord(songId: string, lineId: string, token: string): Promise<ActionResult<{ draft: VocabDraft }>>;
  addVocabulary(songId: string, lineId: string, token: string, draft: VocabDraft): Promise<ActionResult<{ word: AddedWord }>>;
  removeVocabulary(songId: string, vocabId: string): Promise<ActionResult<{ restore: VocabRestore }>>;
  restoreVocabulary(songId: string, restore: VocabRestore): Promise<ActionResult>;
  updateSongDetails(songId: string, details: SongDetails): Promise<ActionResult<{ previous: SongDetails }>>;
  suggestLineChange(songId: string, lineId: string, text: string, note: string): Promise<ActionResult>;
  resolveSuggestion(
    songId: string,
    suggestionId: string,
    decision: "approve" | "reject",
  ): Promise<ActionResult<{ lineId: string; previousEnglish: string | null; text: string }>>;
  reopenSuggestion(
    songId: string,
    suggestionId: string,
    lineId: string,
    previousEnglish: string | null,
    restoreLine: boolean,
  ): Promise<ActionResult>;
};
