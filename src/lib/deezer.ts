// Song search against Deezer's public catalog (no account or key needed). Used to find a song by
// title and fill in its artist, album and cover art. Server-side only.
export type SongMatch = { id: string; title: string; artist: string; album: string; coverUrl: string | null };

export class CatalogError extends Error {}

type DeezerTrack = {
  id?: number | string;
  title?: string;
  title_short?: string;
  artist?: { name?: string };
  album?: { title?: string; cover_medium?: string; cover_big?: string };
};

// Cover art is only ever saved if it really comes from Deezer's image servers over https.
export function isTrustedCover(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /(^|\.)dzcdn\.net$/.test(u.hostname);
  } catch {
    return false;
  }
}

export function parseSearch(json: unknown): SongMatch[] {
  const data = (json as { data?: DeezerTrack[] } | null)?.data;
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const out: SongMatch[] = [];
  for (const t of data) {
    const title = (t.title_short || t.title || "").trim();
    const artist = (t.artist?.name ?? "").trim();
    if (!title || !artist) continue;
    const key = `${title.toLowerCase()}|${artist.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cover = t.album?.cover_big || t.album?.cover_medium || null;
    out.push({
      id: String(t.id ?? key),
      title,
      artist,
      album: (t.album?.title ?? "").trim(),
      coverUrl: isTrustedCover(cover) ? cover : null,
    });
    if (out.length >= 8) break;
  }
  return out;
}

export async function searchSongs(query: string): Promise<SongMatch[]> {
  const q = query.trim();
  if (!q) return [];
  const url = new URL("https://api.deezer.com/search");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "12");
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  } catch {
    throw new CatalogError("The song search isn't reachable right now. You can enter the title and artist yourself.");
  }
  if (!response.ok) throw new CatalogError("The song search had a problem. You can enter the title and artist yourself.");
  const json = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (json && typeof json === "object" && "error" in json) {
    throw new CatalogError("The song search is busy. Please try again in a moment.");
  }
  return parseSearch(json);
}
