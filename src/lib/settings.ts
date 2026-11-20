import type { SupabaseClient } from "@supabase/supabase-js";
import { isDirection, type Direction } from "./study";

export type UserSettings = {
  /** Correct answers needed before a word counts as Learned (1 to 3). */
  learnAfter: number;
  direction: Direction;
  showTranslit: boolean;
  /** Show the vowel marks (nikud) in conjugations. */
  showNikud: boolean;
  /** The player a song page opens with. */
  preferredPlayer: "spotify" | "youtube";
  /** How big the lyrics are on the song page. */
  lyricsSize: LyricsSize;
  /** The voice used for spoken words, wherever the app speaks. */
  speechVoice: SpeechVoice;
};

export type LyricsSize = "small" | "medium" | "large";
export const isLyricsSize = (v: unknown): v is LyricsSize => v === "small" || v === "medium" || v === "large";

export type SpeechVoice = "female" | "male";
export const isSpeechVoice = (v: unknown): v is SpeechVoice => v === "female" || v === "male";

export const DEFAULT_SETTINGS: UserSettings = { learnAfter: 2, direction: "he-en", showTranslit: true, showNikud: true, preferredPlayer: "youtube", lyricsSize: "medium", speechVoice: "female" };

// Loads a person's settings. If the newer settings columns don't exist yet (the database script
// hasn't been run), it falls back to the defaults instead of failing.
export async function loadSettings(supabase: SupabaseClient, userId: string): Promise<UserSettings> {
  const build = (data: { learn_after?: unknown; study_direction?: unknown; show_transliteration?: boolean | null; show_nikud?: boolean | null; preferred_player?: string | null; lyrics_size?: string | null; speech_voice?: string | null }) => {
    const n = Number(data.learn_after);
    return {
      learnAfter: n >= 1 && n <= 3 ? n : DEFAULT_SETTINGS.learnAfter,
      direction: isDirection(data.study_direction) ? data.study_direction : DEFAULT_SETTINGS.direction,
      showTranslit: data.show_transliteration ?? DEFAULT_SETTINGS.showTranslit,
      showNikud: data.show_nikud ?? DEFAULT_SETTINGS.showNikud,
      preferredPlayer: data.preferred_player === "spotify" ? ("spotify" as const) : ("youtube" as const),
      lyricsSize: isLyricsSize(data.lyrics_size) ? data.lyrics_size : DEFAULT_SETTINGS.lyricsSize,
      speechVoice: isSpeechVoice(data.speech_voice) ? data.speech_voice : DEFAULT_SETTINGS.speechVoice,
    };
  };
  const withVoice = await supabase
    .from("profiles")
    .select("learn_after, study_direction, show_transliteration, show_nikud, preferred_player, lyrics_size, speech_voice")
    .eq("id", userId)
    .maybeSingle();
  if (!withVoice.error && withVoice.data) return build(withVoice.data);
  const withSize = await supabase
    .from("profiles")
    .select("learn_after, study_direction, show_transliteration, show_nikud, preferred_player, lyrics_size")
    .eq("id", userId)
    .maybeSingle();
  if (!withSize.error && withSize.data) return build(withSize.data);
  const full = await supabase
    .from("profiles")
    .select("learn_after, study_direction, show_transliteration, show_nikud, preferred_player")
    .eq("id", userId)
    .maybeSingle();
  if (!full.error && full.data) return build(full.data);
  // Older databases: leave out the columns that don't exist yet.
  const noPlayer = await supabase
    .from("profiles")
    .select("learn_after, study_direction, show_transliteration, show_nikud")
    .eq("id", userId)
    .maybeSingle();
  if (!noPlayer.error && noPlayer.data) return build(noPlayer.data);
  const learning = await supabase
    .from("profiles")
    .select("learn_after, study_direction, show_transliteration")
    .eq("id", userId)
    .maybeSingle();
  if (!learning.error && learning.data) return build(learning.data);
  const basic = await supabase.from("profiles").select("show_transliteration").eq("id", userId).maybeSingle();
  return { ...DEFAULT_SETTINGS, showTranslit: basic.data?.show_transliteration ?? DEFAULT_SETTINGS.showTranslit };
}
