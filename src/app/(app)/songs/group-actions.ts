"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Song groups and the person's own song order. Everything here belongs to the signed-in person only
// (row-level security enforces it too). Nothing throws: a failure comes back as { ok: false, error }.
export type GroupResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
export type SongGroup = { id: string; name: string; position: number };

const GENERIC = "Something went wrong. Please try again.";
const MISSING = "Groups need the latest database update, which hasn't been run yet.";
const MAX_NAME = 60;
const fail = <T extends object = object>(error: string): GroupResult<T> => ({ ok: false, error });

function missingColumns(error: { message?: string; code?: string } | null | undefined) {
  const m = error?.message ?? "";
  return error?.code === "42P01" || error?.code === "PGRST205" || /song_groups|group_id|position/.test(m) && /exist|schema cache|column/.test(m);
}

async function who() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createGroup(name: string): Promise<GroupResult<{ group: SongGroup }>> {
  try {
    const { supabase, user } = await who();
    if (!user) return fail("Please sign in again.");
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return fail("Give the group a name.");
    if (clean.length > MAX_NAME) return fail(`Group names can be up to ${MAX_NAME} characters.`);
    const { data: last, error: lastError } = await supabase.from("song_groups").select("position").eq("user_id", user.id).order("position", { ascending: false }).limit(1);
    if (lastError) return fail(missingColumns(lastError) ? MISSING : GENERIC);
    const position = (last?.[0]?.position ?? -1) + 1;
    const { data, error } = await supabase.from("song_groups").insert({ user_id: user.id, name: clean, position }).select("id, name, position").single();
    if (error || !data) return fail(GENERIC);
    revalidatePath("/songs");
    return { ok: true, group: data as SongGroup };
  } catch (error) {
    console.error("createGroup crashed", error);
    return fail(GENERIC);
  }
}

export async function renameGroup(groupId: string, name: string): Promise<GroupResult<{ name: string }>> {
  try {
    const { supabase, user } = await who();
    if (!user) return fail("Please sign in again.");
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return fail("Give the group a name.");
    if (clean.length > MAX_NAME) return fail(`Group names can be up to ${MAX_NAME} characters.`);
    const { error } = await supabase.from("song_groups").update({ name: clean }).eq("id", groupId).eq("user_id", user.id);
    if (error) return fail(GENERIC);
    revalidatePath("/songs");
    return { ok: true, name: clean };
  } catch (error) {
    console.error("renameGroup crashed", error);
    return fail(GENERIC);
  }
}

// Deletes only the group. Its songs drop back to "not in a group" (the database does that).
export async function deleteGroup(groupId: string): Promise<GroupResult> {
  try {
    const { supabase, user } = await who();
    if (!user) return fail("Please sign in again.");
    const { error } = await supabase.from("song_groups").delete().eq("id", groupId).eq("user_id", user.id);
    if (error) return fail(GENERIC);
    revalidatePath("/songs");
    return { ok: true };
  } catch (error) {
    console.error("deleteGroup crashed", error);
    return fail(GENERIC);
  }
}

// Puts a song in a group (or in no group), at the end of that group.
export async function moveSongToGroup(songId: string, groupId: string | null): Promise<GroupResult<{ position: number }>> {
  try {
    const { supabase, user } = await who();
    if (!user) return fail("Please sign in again.");
    let q = supabase.from("user_songs").select("position").eq("user_id", user.id);
    q = groupId ? q.eq("group_id", groupId) : q.is("group_id", null);
    const { data: last, error: lastError } = await q.order("position", { ascending: false }).limit(1);
    if (lastError) return fail(missingColumns(lastError) ? MISSING : GENERIC);
    const position = (last?.[0]?.position ?? -1) + 1;
    const { error } = await supabase.from("user_songs").update({ group_id: groupId, position }).eq("user_id", user.id).eq("song_id", songId);
    if (error) return fail(GENERIC);
    revalidatePath("/songs");
    return { ok: true, position };
  } catch (error) {
    console.error("moveSongToGroup crashed", error);
    return fail(GENERIC);
  }
}

// Saves a new order for the songs in one group (or the ungrouped ones). The list must be exactly the
// songs already there.
export async function reorderSongs(groupId: string | null, orderedSongIds: string[]): Promise<GroupResult> {
  try {
    const { supabase, user } = await who();
    if (!user) return fail("Please sign in again.");
    let q = supabase.from("user_songs").select("song_id").eq("user_id", user.id);
    q = groupId ? q.eq("group_id", groupId) : q.is("group_id", null);
    const { data: current, error: currentError } = await q;
    if (currentError) return fail(missingColumns(currentError) ? MISSING : GENERIC);
    const have = new Set((current ?? []).map((r) => r.song_id as string));
    if (orderedSongIds.length !== have.size || new Set(orderedSongIds).size !== have.size || !orderedSongIds.every((id) => have.has(id))) {
      return fail("The list changed. Please reload and try again.");
    }
    const results = await Promise.all(
      orderedSongIds.map((songId, i) => supabase.from("user_songs").update({ position: i }).eq("user_id", user.id).eq("song_id", songId)),
    );
    if (results.some((r) => r.error)) return fail(GENERIC);
    revalidatePath("/songs");
    return { ok: true };
  } catch (error) {
    console.error("reorderSongs crashed", error);
    return fail(GENERIC);
  }
}

export async function reorderGroups(orderedGroupIds: string[]): Promise<GroupResult> {
  try {
    const { supabase, user } = await who();
    if (!user) return fail("Please sign in again.");
    const { data: current, error: currentError } = await supabase.from("song_groups").select("id").eq("user_id", user.id);
    if (currentError) return fail(missingColumns(currentError) ? MISSING : GENERIC);
    const have = new Set((current ?? []).map((r) => r.id as string));
    if (orderedGroupIds.length !== have.size || new Set(orderedGroupIds).size !== have.size || !orderedGroupIds.every((id) => have.has(id))) {
      return fail("The list changed. Please reload and try again.");
    }
    const results = await Promise.all(orderedGroupIds.map((id, i) => supabase.from("song_groups").update({ position: i }).eq("id", id).eq("user_id", user.id)));
    if (results.some((r) => r.error)) return fail(GENERIC);
    revalidatePath("/songs");
    return { ok: true };
  } catch (error) {
    console.error("reorderGroups crashed", error);
    return fail(GENERIC);
  }
}
