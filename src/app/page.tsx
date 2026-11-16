import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="hebrew text-6xl font-bold text-accent">מילים</h1>
      <p className="text-2xl font-semibold">Milim</p>
      <p className="max-w-sm text-muted">Learn Hebrew through the songs you love.</p>
      <Link
        href="/login"
        className="mt-2 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-contrast transition-colors hover:bg-accent-strong"
      >
        Sign in
      </Link>
    </main>
  );
}
