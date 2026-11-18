export type Media = { type: "spotify" | "youtube"; url: string; embedUrl: string };

// Turn a pasted Spotify or YouTube link into an embeddable player URL.
export function parseMedia(input: string | null | undefined): Media | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "open.spotify.com") {
    const m = url.pathname.match(/\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/);
    if (m) {
      return {
        type: "spotify",
        url: url.toString(),
        embedUrl: `https://open.spotify.com/embed/${m[1]}/${m[2]}`,
      };
    }
    return null;
  }

  let id: string | null = null;
  if (host === "youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{6,})/);
      id = m ? m[1] : null;
    }
  } else if (host === "youtu.be") {
    id = url.pathname.slice(1) || null;
  }
  if (id && /^[A-Za-z0-9_-]{6,}$/.test(id)) {
    return {
      type: "youtube",
      url: url.toString(),
      embedUrl: `https://www.youtube.com/embed/${id}`,
    };
  }
  return null;
}

// Which of a song's two players to show first. The preferred one when the song has it, otherwise the
// other; `other` is the one the switch on the song page can flip to (null when there is only one).
export function pickPlayer(
  spotify: Media | null,
  youtube: Media | null,
  preferred: "spotify" | "youtube",
): { primary: Media | null; other: Media | null } {
  const first = preferred === "spotify" ? spotify : youtube;
  const second = preferred === "spotify" ? youtube : spotify;
  if (first && second) return { primary: first, other: second };
  return { primary: first ?? second, other: null };
}
