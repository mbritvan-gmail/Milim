"use client";

import Link from "next/link";

// Shown if something unexpected breaks on a song page, instead of a blank crash.
export default function SongsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted">
        This page hit a problem. Your songs are safe. Try again, or go back to your list.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="h-11 rounded-xl bg-accent px-5 font-semibold text-accent-contrast hover:bg-accent-strong"
        >
          Try again
        </button>
        <Link href="/songs" className="flex h-11 items-center rounded-xl border border-border px-5 hover:bg-surface-2">
          My songs
        </Link>
      </div>
    </main>
  );
}
