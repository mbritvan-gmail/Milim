import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { fingerprint } from "@/lib/study";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings · milim" };

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <SettingsBody />
      </Suspense>
    </main>
  );
}

async function SettingsBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const settings = await loadSettings(supabase, user.id);

  return (
    <>
      <header className="flex flex-col gap-1">
        <Link href="/songs" className="text-sm text-muted underline underline-offset-4">
          ← My songs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Settings</h1>
      </header>
      <SettingsForm
        key={fingerprint([settings.learnAfter, settings.direction, settings.showTranslit])}
        initialLearnAfter={settings.learnAfter}
        initialDirection={settings.direction}
        initialShowTranslit={settings.showTranslit}
        email={user.email ?? ""}
      />
    </>
  );
}
