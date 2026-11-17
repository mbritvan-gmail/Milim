import type { SupabaseClient } from "@supabase/supabase-js";
import { isDirection, type Direction } from "./study";

export type UserSettings = {
  /** Correct answers needed before a word counts as Learned (1 to 3). */
  learnAfter: number;
  direction: Direction;
  showTranslit: boolean;
};

export const DEFAULT_SETTINGS: UserSettings = { learnAfter: 2, direction: "he-en", showTranslit: true };

// Loads a person's settings. If the newer settings columns don't exist yet (the database script
// hasn't been run), it falls back to the defaults instead of failing.
export async function loadSettings(supabase: SupabaseClient, userId: string): Promise<UserSettings> {
  const full = await supabase
    .from("profiles")
    .select("learn_after, study_direction, show_transliteration")
    .eq("id", userId)
    .maybeSingle();
  if (!full.error && full.data) {
    const n = Number(full.data.learn_after);
    return {
      learnAfter: n >= 1 && n <= 3 ? n : DEFAULT_SETTINGS.learnAfter,
      direction: isDirection(full.data.study_direction) ? full.data.study_direction : DEFAULT_SETTINGS.direction,
      showTranslit: full.data.show_transliteration ?? DEFAULT_SETTINGS.showTranslit,
    };
  }
  const basic = await supabase.from("profiles").select("show_transliteration").eq("id", userId).maybeSingle();
  return { ...DEFAULT_SETTINGS, showTranslit: basic.data?.show_transliteration ?? DEFAULT_SETTINGS.showTranslit };
}
