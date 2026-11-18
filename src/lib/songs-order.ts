// Searching, sorting and grouping a person's song list.
export type SortKey = "manual" | "title" | "artist" | "recent";
export const SORTS: { id: SortKey; label: string }[] = [
  { id: "manual", label: "My order" },
  { id: "title", label: "Title" },
  { id: "artist", label: "Artist" },
  { id: "recent", label: "Recently added" },
];
export function isSortKey(x: unknown): x is SortKey {
  return x === "manual" || x === "title" || x === "artist" || x === "recent";
}

export type OrderedSong = { id: string; title: string; artist: string | null; position: number; addedAt: string };

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

// Orders songs for display. "My order" uses each song's saved position (newest first among songs that
// were never placed); the others sort by the field, with songs that lack an artist last.
export function sortSongs<T extends OrderedSong>(songs: T[], key: SortKey): T[] {
  const byRecent = (a: T, b: T) => (a.addedAt < b.addedAt ? 1 : a.addedAt > b.addedAt ? -1 : 0);
  const copy = [...songs];
  switch (key) {
    case "title":
      return copy.sort((a, b) => collator.compare(a.title, b.title));
    case "artist":
      return copy.sort((a, b) => {
        if (!a.artist && !b.artist) return collator.compare(a.title, b.title);
        if (!a.artist) return 1;
        if (!b.artist) return -1;
        return collator.compare(a.artist, b.artist) || collator.compare(a.title, b.title);
      });
    case "recent":
      return copy.sort(byRecent);
    default:
      return copy.sort((a, b) => a.position - b.position || byRecent(a, b));
  }
}

// Songs whose title or artist contains the text (ignoring case and surrounding spaces).
export function filterSongs<T extends { title: string; artist: string | null }>(songs: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return songs;
  return songs.filter((s) => s.title.toLowerCase().includes(q) || (s.artist ?? "").toLowerCase().includes(q));
}
