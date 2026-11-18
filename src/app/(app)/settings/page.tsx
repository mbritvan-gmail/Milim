import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { fingerprint } from "@/lib/study";
import { SettingsForm } from "./settings-form";
import { PageClose } from "@/components/overlay";
import { isNikudAdmin } from "@/lib/nikud-admin";
import { loadNikudStatus } from "./nikud-tool-actions";
import { NikudTool } from "./nikud-tool";

export const metadata = { title: "Settings · milim" };

// The temporary nikud tool adds nikud to one song per request, which can take up to a minute.
export const maxDuration = 60;

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
  // TEMPORARY: only the account named in NIKUD_ADMIN_EMAIL sees the nikud tool.
  const nikud = isNikudAdmin(user.email) ? await loadNikudStatus() : null;

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
      {nikud && "error" in nikud && <p className="text-sm text-danger">Nikud tool: {nikud.error}</p>}
      {nikud && !("error" in nikud) && <NikudTool key={nikud.missing.map((m) => m.id).join(",")} total={nikud.total} missing={nikud.missing} />}
    </>
  );
}
