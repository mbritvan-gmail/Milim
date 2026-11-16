import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My songs · Milim" };

export default function SongsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <SongsBody />
      </Suspense>
    </main>
  );
}

async function SongsBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already redirects signed-out visitors; this is a second check.
  if (!user) redirect("/login");

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My songs</h1>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm text-muted underline underline-offset-4">
            Sign out
          </button>
        </form>
      </header>
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-medium">{user.email}</p>
      </div>
      <p className="text-center text-muted">Your songs will appear here soon.</p>
    </>
  );
}
