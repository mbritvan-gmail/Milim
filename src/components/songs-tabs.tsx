import Link from "next/link";

// "My songs", "Public library" and "Requests" are three views of the Songs module.
export function SongsTabs({ active }: { active: "mine" | "library" | "requests" }) {
  const tab = (on: boolean) =>
    `flex h-10 flex-1 items-center justify-center rounded-lg text-xs font-semibold sm:text-sm transition-colors ${on ? "bg-accent text-accent-contrast" : "text-muted hover:text-foreground"}`;
  return (
    <div role="tablist" aria-label="Songs" className="flex gap-1 rounded-xl border border-border bg-surface p-1">
      <Link href="/songs" role="tab" aria-selected={active === "mine"} className={tab(active === "mine")}>
        My songs
      </Link>
      <Link href="/library" role="tab" aria-selected={active === "library"} className={tab(active === "library")}>
        Public library
      </Link>
      <Link href="/requests" role="tab" aria-selected={active === "requests"} className={tab(active === "requests")}>
        Requests
      </Link>
    </div>
  );
}
