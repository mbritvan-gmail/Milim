"use server";

import { createClient } from "@/lib/supabase/server";
import { hasHebrew, isSectionLabel } from "@/lib/lyrics";

// The songs this person owns that still have lyric lines without nikud, for the "Add nikud to all my songs" button.
export async function songsNeedingNikud(): Promise<{ ok: true; songs: { id: string; title: string; missing: number }[] } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in again." };

    const songsRes = await supabase.from("songs").select("id, title").eq("owner_id", user.id).order("created_at");
    if (songsRes.error) return { ok: false, error: "Couldn't load your songs." };
    const songs = songsRes.data ?? [];
    const result: { id: string; title: string; missing: number }[] = [];
    for (let i = 0; i < songs.length; i += 20) {
      const group = songs.slice(i, i + 20);
      const { data, error } = await supabase.from("lines").select("song_id, hebrew, vocalized").in("song_id", group.map((s) => s.id));
      if (error) {
        if (/vocalized/.test(error.message)) return { ok: false, error: "Nikud for songs needs the latest database update, which hasn't been run yet." };
        return { ok: false, error: "Couldn't load your songs." };
      }
      for (const song of group) {
        const missing = (data ?? []).filter((l) => l.song_id === song.id && !l.vocalized && !isSectionLabel(l.hebrew) && hasHebrew(l.hebrew)).length;
        if (missing > 0) result.push({ id: song.id, title: song.title, missing });
      }
    }
    return { ok: true, songs: result };
  } catch (error) {
    console.error("songsNeedingNikud crashed", error);
    return { ok: false, error: "Couldn't load your songs." };
  }
}
