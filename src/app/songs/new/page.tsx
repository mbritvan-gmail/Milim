import Link from "next/link";
import { NewSongForm } from "./new-song-form";

export const metadata = { title: "Add lyrics · Milim" };

// Translating a full song can take a while.
export const maxDuration = 60;

export default function NewSongPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Add lyrics</h1>
        <Link href="/songs" className="text-sm text-muted underline underline-offset-4">
          Cancel
        </Link>
      </header>
      <NewSongForm />
    </main>
  );
}
