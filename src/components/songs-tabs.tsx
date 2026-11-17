import Link from "next/link";

// "My songs" and "Public library" are two views of the Songs module.
export function SongsTabs({ active }: { active: "mine" | "library" }) {
  const tab = (on: boolean) =>
    `flex h-10 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${on ? "bg-accent text-accent-contrast" : "text-muted hover:text-foreground"}`;
  return (
    <div role="tablist" aria-label="Songs" className="flex gap-1 rounded-xl border border-border bg-surface p-1">
      <Link href="/songs" role="tab" aria-selected={active === "mine"} className={tab(active === "mine")}>
        My songs
      </Link>
      <Link href="/library" role="tab" aria-selected={active === "library"} className={tab(active === "library")}>
        Public library
      </Link>
    </div>
  );
}
