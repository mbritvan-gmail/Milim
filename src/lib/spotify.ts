// Spotify search using the app-only ("client credentials") flow: no user login needed.
// Needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.

export type SpotifyMatch = { url: string; name: string; artists: string; image: string | null };

export class SpotifyError extends Error {}

let cached: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new SpotifyError("Spotify search isn't set up yet.");

  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new SpotifyError("Couldn't connect to Spotify. Check the Spotify settings.");
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

type SpotifyTrack = {
  name: string;
  artists: { name: string }[];
  album?: { images?: { url: string; width: number }[] };
  external_urls: { spotify: string };
};

async function search(query: string, token: string): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({ q: query, type: "track", limit: "5" });
  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) cached = null; // token went stale; the next search fetches a new one
  if (!res.ok) throw new SpotifyError("Spotify search failed. Please try again.");
  const data = (await res.json()) as { tracks?: { items?: SpotifyTrack[] } };
  return data.tracks?.items ?? [];
}

export async function findTracks(title: string, artist: string): Promise<SpotifyMatch[]> {
  const token = await getToken();
  const clean = (s: string) => s.replace(/["]/g, " ").trim();

  // Precise search first, then a looser one if that finds nothing.
  let items: SpotifyTrack[] = [];
  if (artist) items = await search(`track:"${clean(title)}" artist:"${clean(artist)}"`, token);
  if (items.length === 0) items = await search(`${clean(title)} ${clean(artist)}`.trim(), token);

  return items.map((t) => {
    const images = [...(t.album?.images ?? [])].sort((a, b) => a.width - b.width);
    return {
      url: t.external_urls.spotify,
      name: t.name,
      artists: t.artists.map((a) => a.name).join(", "),
      image: images[0]?.url ?? null,
    };
  });
}
