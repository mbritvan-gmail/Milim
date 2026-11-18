"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDirection } from "@/lib/study";

export type SettingsChange = { learnAfter?: number; direction?: string; showTranslit?: boolean; showNikud?: boolean; preferredPlayer?: string };

// Save one or more settings. Returns an error message, or null when everything was saved.
export async function saveSettings(change: SettingsChange): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "Please sign in again.";

    if (change.learnAfter !== undefined) {
      const n = Math.floor(change.learnAfter);
      if (n < 1 || n > 3) return "Choose 1, 2 or 3.";
      // Also counts words that already have enough correct answers as learned.
      const { error } = await supabase.rpc("set_learn_after", { p_n: n });
      if (error) {
        console.error("set_learn_after failed", error);
        return "Couldn't save that. Has the latest database update been applied?";
      }
    }

    const profile: Record<string, unknown> = {};
    if (change.direction !== undefined) {
      if (!isDirection(change.direction)) return "Unknown direction.";
      profile.study_direction = change.direction;
    }
    if (change.showTranslit !== undefined) profile.show_transliteration = Boolean(change.showTranslit);
    if (change.showNikud !== undefined) profile.show_nikud = Boolean(change.showNikud);
    if (change.preferredPlayer !== undefined) {
      if (change.preferredPlayer !== "spotify" && change.preferredPlayer !== "youtube") return "Unknown player.";
      profile.preferred_player = change.preferredPlayer;
    }
    if (Object.keys(profile).length > 0) {
      const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
      if (error) {
        console.error("profile update failed", error);
        if (change.preferredPlayer !== undefined && /preferred_player/i.test(error.message)) {
          return "Couldn't save that yet. The latest database update (the song links script) hasn't been run.";
        }
        if (change.showNikud !== undefined && /show_nikud/i.test(error.message)) {
          return "Couldn't save that yet. The latest database update (the conjugation script) hasn't been run.";
        }
        return "Couldn't save that. Please try again.";
      }
    }
    // Pages already visited keep their old copy; tell them settings changed so Back shows the new setting.
    revalidatePath("/", "layout");
    return null;
  } catch (error) {
    console.error("saveSettings crashed", error);
    return "Couldn't save that. Please try again.";
  }
}
