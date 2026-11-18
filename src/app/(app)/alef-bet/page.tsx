import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StartScreen } from "./start-screen";

export const metadata = { title: "Alef-bet · milim" };

export default function AlefBetPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <AlefBetBody />
      </Suspense>
    </main>
  );
}

async function AlefBetBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [seenRes, packRes] = await Promise.all([
    supabase.from("alef_cards_seen").select("card_id"),
    // Basic words is an ordinary public Word Pack titled "Basic words" (the oldest one if there are several).
    supabase.from("modules").select("id").eq("visibility", "public").is("archived_at", null).ilike("title", "basic words").order("created_at").limit(1),
  ]);
  const notSaved = Boolean(seenRes.error);
  const seen = new Set(seenRes.error ? [] : (seenRes.data ?? []).map((r) => r.card_id as string));

  return <StartScreen seen={seen} notSaved={notSaved} basicWordsPackId={(packRes.data?.[0]?.id as string | undefined) ?? null} />;
}
