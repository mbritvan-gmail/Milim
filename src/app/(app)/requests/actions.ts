"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readSongLinks } from "@/lib/song-links";

// Song requests: a song's details without its lyrics, for someone else to fill in.
export type RequestState = { error?: string };
export type ExistingMatch = {
  song?: { id: string; title: string; artist: string | null; inMyList: boolean };
  request?: { id: string; title: string; artist: string | null; byName: string | null };
};

const MISSING = "Song requests need the latest database update, which hasn't been run yet.";
const missing = (e: { message?: string; code?: string } | null | undefined) =>
  Boolean(e && (e.code === "42P01" || e.code === "PGRST205" || /song_requests/.test(e.message ?? "")));

// Before asking for a song, see whether it is already in the library or already requested.
export async function checkExisting(title: string, artist: string): Promise<ExistingMatch> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const t = title.trim().replace(/[%_]/g, " ").slice(0, 120);
    if (!user || t.length < 2) return {};
    const a = artist.trim().replace(/[%_]/g, " ").slice(0, 120);

    let songQ = supabase.from("songs").select("id, title, artist").eq("visibility", "public").is("archived_at", null).ilike("title", `%${t}%`).limit(5);
    if (a) songQ = songQ.ilike("artist", `%${a}%`);
    const { data: songs } = await songQ;
    const found = songs?.[0];
    const out: ExistingMatch = {};
    if (found) {
      const { data: mine } = await supabase.from("user_songs").select("song_id").eq("song_id", found.id).maybeSingle();
      out.song = { id: found.id, title: found.title, artist: found.artist, inMyList: Boolean(mine) };
    }

    let reqQ = supabase.from("song_requests").select("id, title, artist, requester_id").eq("status", "open").ilike("title", `%${t}%`).limit(5);
    if (a) reqQ = reqQ.ilike("artist", `%${a}%`);
    const { data: reqs, error } = await reqQ;
    if (!error && reqs?.[0]) {
      const r = reqs[0];
      const { data: who } = await supabase.from("profiles").select("display_name").eq("id", r.requester_id).maybeSingle();
      out.request = { id: r.id, title: r.title, artist: r.artist, byName: who?.display_name ?? null };
    }
    return out;
  } catch (error) {
    console.error("checkExisting failed", error);
    return {};
  }
}

export async function createRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  let ok = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const title = String(formData.get("title") ?? "").trim();
    const artist = String(formData.get("artist") ?? "").trim();
    if (!title) return { error: "Please give the song a title." };
    if (title.length > 120 || artist.length > 120) return { error: "Title and artist must be under 120 characters." };
    const links = readSongLinks(formData);
    if ("error" in links) return { error: links.error };

    const { error } = await supabase.from("song_requests").insert({
      requester_id: user.id,
      title,
      artist: artist || null,
      album: links.album,
      cover_url: links.coverUrl,
      spotify_url: links.spotifyUrl,
      youtube_url: links.youtubeUrl,
    });
    if (error) {
      console.error("createRequest failed", error);
      return { error: missing(error) ? MISSING : "Couldn't save your request. Please try again." };
    }
    ok = true;
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("createRequest crashed", error);
    return { error: "Something went wrong. Please try again." };
  }
  if (ok) {
    revalidatePath("/requests");
    // Replace the form in the history, so closing returns to where the request was started.
    redirect("/requests", RedirectType.replace);
  }
  return {};
}

// The author takes back their own open request.
export async function cancelRequest(requestId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "Please sign in again.";
    const { data, error } = await supabase.from("song_requests").update({ status: "cancelled" }).eq("id", requestId).eq("requester_id", user.id).eq("status", "open").select("id");
    if (error || !data || data.length === 0) return "Couldn't cancel that request. It may have just been filled.";
    revalidatePath("/requests");
    return null;
  } catch (error) {
    console.error("cancelRequest crashed", error);
    return "Couldn't cancel that request. Please try again.";
  }
}
