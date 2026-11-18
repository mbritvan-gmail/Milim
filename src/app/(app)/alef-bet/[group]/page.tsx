import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { newSessionId } from "@/lib/study";
import { cardsOfGroup, groupByNumber, startIndexFor } from "@/lib/alef-bet/letters";
import { scriptFont } from "@/lib/alef-bet/fonts";
import { CardRunner } from "./card-runner";

export const metadata = { title: "Alef-bet · milim" };

// One group's letter cards. Opened over the start screen as a full-screen pop-up (see @modal), or as a
// normal page when the address is opened directly.
export default function GroupPage({ params }: { params: Promise<{ group: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted">Loading…</p>}>
      <GroupBody params={params} />
    </Suspense>
  );
}

async function GroupBody({ params }: { params: Promise<{ group: string }> }) {
  const { group: raw } = await params;
  const group = /^[1-9]$/.test(raw) ? groupByNumber(Number(raw)) : undefined;
  if (!group) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [seenRes, settings] = await Promise.all([
    supabase.from("alef_cards_seen").select("card_id"),
    loadSettings(supabase, user.id),
  ]);
  // If the trainer's database update hasn't been run, there is simply no progress yet.
  const seen = seenRes.error ? [] : (seenRes.data ?? []).map((r) => r.card_id as string);

  return (
    <CardRunner
      key={newSessionId()}
      cards={cardsOfGroup(group)}
      startIndex={startIndexFor(group, seen)}
      groupNumber={group.n}
      groupName={group.plainTitle ?? `Group ${group.n}`}
      showNikud={settings.showNikud}
      showTranslit={settings.showTranslit}
      scriptClass={scriptFont.className}
      backHref="/alef-bet"
    />
  );
}
