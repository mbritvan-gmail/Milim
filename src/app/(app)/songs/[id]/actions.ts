"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Remember the user's transliteration on/off preference.
export async function setTransliteration(show: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ show_transliteration: show }).eq("id", user.id);
}

// Remove a song from the signed-in user's account. What that means depends on the song:
//  - their own private song: deleted for good
//  - their own public song: archived (kept for people who already added it, hidden from
//    the public library) and removed from their list; public songs are never hard-deleted
//  - someone else's song: just removed from their list
export async function removeSong(songId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: song } = await supabase
    .from("songs")
    .select("id, owner_id, visibility")
    .eq("id", songId)
    .maybeSingle();

  if (song && song.owner_id === user.id && song.visibility === "private") {
    const { error } = await supabase.from("songs").delete().eq("id", songId);
    if (error) throw new Error(`delete song: ${error.message}`);
  } else {
    if (song && song.owner_id === user.id) {
      const { error } = await supabase
        .from("songs")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", songId);
      if (error) throw new Error(`archive song: ${error.message}`);
    }
    const { error } = await supabase
      .from("user_songs")
      .delete()
      .eq("user_id", user.id)
      .eq("song_id", songId);
    if (error) throw new Error(`remove from list: ${error.message}`);
  }

  redirect("/songs");
}
