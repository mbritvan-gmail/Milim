// Only allow redirects to paths inside this site (blocks open-redirect tricks
// like "//evil.com" or "https://evil.com").
export function safeNext(next: string | null | undefined, fallback = "/home") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
