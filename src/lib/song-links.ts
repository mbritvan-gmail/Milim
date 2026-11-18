import { isTrustedCover } from "./deezer";
import { parseMedia } from "./media";

export type SongLinks = { spotifyUrl: string | null; youtubeUrl: string | null; coverUrl: string | null; album: string | null };

// Checks the two player links and the cover art of a song. Each link must be the right kind of link
// (Spotify or YouTube); cover art is only kept if it comes from the music catalog's image servers.
export function checkSongLinks(input: { spotify?: string | null; youtube?: string | null; cover?: string | null; album?: string | null }): { error: string } | SongLinks {
  const spotify = (input.spotify ?? "").trim();
  const youtube = (input.youtube ?? "").trim();
  const cover = (input.cover ?? "").trim();
  const album = (input.album ?? "").trim().slice(0, 200);
  const sp = spotify ? parseMedia(spotify) : null;
  const yt = youtube ? parseMedia(youtube) : null;
  if (spotify && sp?.type !== "spotify") return { error: "That doesn't look like a Spotify link." };
  if (youtube && yt?.type !== "youtube") return { error: "That doesn't look like a YouTube link." };
  return { spotifyUrl: sp?.url ?? null, youtubeUrl: yt?.url ?? null, coverUrl: isTrustedCover(cover) ? cover : null, album: album || null };
}

export function readSongLinks(formData: FormData) {
  return checkSongLinks({
    spotify: String(formData.get("spotify_url") ?? ""),
    youtube: String(formData.get("youtube_url") ?? ""),
    cover: String(formData.get("cover_url") ?? ""),
    album: String(formData.get("album") ?? ""),
  });
}

// The columns to write. The old single link (media_url / media_type) is kept in step with the new ones:
// it holds YouTube if there is one (it plays the whole song), else Spotify.
export function songLinkColumns(l: SongLinks) {
  const primary = l.youtubeUrl ? { url: l.youtubeUrl, type: "youtube" as const } : l.spotifyUrl ? { url: l.spotifyUrl, type: "spotify" as const } : null;
  return {
    extended: { spotify_url: l.spotifyUrl, youtube_url: l.youtubeUrl, cover_url: l.coverUrl, album: l.album, media_url: primary?.url ?? null, media_type: primary?.type ?? null },
    legacy: { media_url: primary?.url ?? null, media_type: primary?.type ?? null },
  };
}

// True when a database error is only about the newer link / art columns not existing yet.
export function isMissingLinkColumn(error: { message?: string } | null | undefined) {
  return Boolean(error && /spotify_url|youtube_url|cover_url|album/.test(error.message ?? "") && /column|schema cache/.test(error.message ?? ""));
}
