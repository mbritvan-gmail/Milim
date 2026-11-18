import Link from "next/link";
import { RequestForm } from "./request-form";

export const metadata = { title: "Request a song · milim" };

export default function RequestSongPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Request a song</h1>
        <Link href="/songs/requests" className="text-sm text-muted underline underline-offset-4">
          Cancel
        </Link>
      </header>
      <p className="-mt-2 text-sm text-muted">Pick the song. Someone can then add the lyrics, and the song lands in your list.</p>
      <RequestForm />
    </main>
  );
}
