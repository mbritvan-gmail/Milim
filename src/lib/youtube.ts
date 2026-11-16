// YouTube search via the YouTube Data API v3. Needs YOUTUBE_API_KEY.
// One search costs 100 of the 10,000 free daily quota units (about 100 searches a day).

export type YouTubeMatch = { url: string; name: string; artists: string; image: string | null };

export class YouTubeError extends Error {}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

type SearchItem = {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string; thumbnails?: { default?: { url?: string }; medium?: { url?: string } } };
};

export async function findVideos(title: string, artist: string): Promise<YouTubeMatch[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YouTubeError("YouTube search isn't set up yet.");

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    maxResults: "5",
    q: `${title} ${artist}`.trim(),
    key,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { cache: "no-store" });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { errors?: { reason?: string }[] } } | null;
    const reason = body?.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      throw new YouTubeError("YouTube search has hit its daily limit. Try again tomorrow, or paste a link.");
    }
    throw new YouTubeError("YouTube search isn't working right now. Check the YouTube settings or paste a link.");
  }

  const data = (await res.json()) as { items?: SearchItem[] };
  return (data.items ?? []).flatMap((item) => {
    const id = item.id?.videoId;
    if (!id) return [];
    return [
      {
        url: `https://www.youtube.com/watch?v=${id}`,
        name: decodeEntities(item.snippet?.title ?? "Untitled"),
        artists: decodeEntities(item.snippet?.channelTitle ?? ""),
        image: item.snippet?.thumbnails?.default?.url ?? item.snippet?.thumbnails?.medium?.url ?? null,
      },
    ];
  });
}
