import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { ALL_CARDS, cardIndex } from "@/lib/alef-bet/letters";
import { scriptFont } from "@/lib/alef-bet/fonts";
import { CardRunner } from "./card-runner";

export const metadata = { title: "Alef-bet · milim" };

// One card, opened from the Alef-bet page. Next and Previous go through every card in order. Opened over the
// page as a full-screen pop-up (see @modal), or as a normal page when the address is opened directly.
export default function CardPage({ params }: { params: Promise<{ card: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted">Loading…</p>}>
      <CardBody params={params} />
    </Suspense>
  );
}

async function CardBody({ params }: { params: Promise<{ card: string }> }) {
  const { card } = await params;
  const start = /^[a-z-]{1,20}$/.test(card) ? cardIndex(card) : -1;
  if (start < 0) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const settings = await loadSettings(supabase, user.id);

  return (
    <CardRunner
      key={card}
      cards={ALL_CARDS}
      startIndex={start}
      showNikud={settings.showNikud}
      showTranslit={settings.showTranslit}
      voice={settings.speechVoice}
      scriptClass={scriptFont.className}
      backHref="/alef-bet"
    />
  );
}
