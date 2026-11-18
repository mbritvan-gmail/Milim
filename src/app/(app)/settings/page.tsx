import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { fingerprint } from "@/lib/study";
import { SettingsForm } from "./settings-form";
import { PageClose } from "@/components/overlay";

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
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <PageClose href="/home" />
      </header>
      <SettingsForm
        key={fingerprint([settings.learnAfter, settings.direction, settings.showTranslit, settings.showNikud, settings.preferredPlayer, settings.lyricsSize])}
        initialLearnAfter={settings.learnAfter}
        initialDirection={settings.direction}
        initialShowTranslit={settings.showTranslit}
        initialShowNikud={settings.showNikud}
        initialPreferredPlayer={settings.preferredPlayer}
        initialLyricsSize={settings.lyricsSize}
        email={user.email ?? ""}
      />
    </>
  );
}
