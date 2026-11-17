"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Remove a song from the signed-in user's account. What that means depends on the song:
//  - their own private song: deleted for good
//  - their own public song: archived (kept for people who already added it, hidden from
//    the public library) and removed from their list; public songs are never hard-deleted
//  - someone else's song: just removed from their list
async function performRemove(songId: string) {
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
  revalidatePath("/", "layout");
}

// From a song's own page: remove it, then go back to the list.
export async function removeSong(songId: string) {
  await performRemove(songId);
  redirect("/songs");
}

// From the song list: remove it and stay on the list. Returns an error message, or null.
export async function removeFromList(songId: string): Promise<string | null> {
  try {
    await performRemove(songId);
    return null;
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("removeFromList failed", error);
    return "Couldn't remove that song. Please try again.";
  }
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
    revalidatePath("/", "layout");
    return true;
  } catch (error) {
    console.error("makeSongPublic crashed", error);
    return false;
  }
}
