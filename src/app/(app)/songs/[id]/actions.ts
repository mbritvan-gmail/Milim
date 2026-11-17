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

// Add someone's public song to the signed-in user's own list.
export async function addSong(songId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    // Row-level security only allows this for songs the user may see (their own or public ones).
    const { error } = await supabase
      .from("user_songs")
      .upsert({ user_id: user.id, song_id: songId }, { onConflict: "user_id,song_id", ignoreDuplicates: true });
    if (error) {
      console.error("addSong failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("addSong crashed", error);
    return false;
  }
}

// Make one of the user's private songs public. This can't be undone (a database rule enforces it).
export async function makeSongPublic(songId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase
      .from("songs")
      .update({ visibility: "public" })
      .eq("id", songId)
      .eq("owner_id", user.id)
      .select("id");
    if (error || !data || data.length === 0) {
      console.error("makeSongPublic failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("makeSongPublic crashed", error);
    return false;
  }
}
