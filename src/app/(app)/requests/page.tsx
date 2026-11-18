import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MenuButton } from "@/components/menu-button";
import { SongsTabs } from "@/components/songs-tabs";
import { createClient } from "@/lib/supabase/server";
import { nowMs } from "@/lib/now";
import { RequestsList, type RequestRow } from "./requests-list";

export const metadata = { title: "Requests · milim" };

export default function RequestsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <RequestsBody />
      </Suspense>
    </main>
  );
}

async function RequestsBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const menu = (
    <MenuButton
      label="Song options"
      items={[
        {
          href: "/songs/new",
          label: "Add song",
          icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          ),
        },
        {
          href: "/songs/request",
          label: "Request song",
          icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z" />
            </svg>
          ),
        },
      ]}
    />
  );
  const header = (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Songs</h1>
        {menu}
      </div>
      <SongsTabs active="requests" />
    </>
  );

  // Open requests, plus ones filled in the last two weeks.
  const since = new Date(nowMs() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const res = await supabase
    .from("song_requests")
    .select("id, requester_id, title, artist, cover_url, status, song_id, fulfilled_by, created_at, fulfilled_at")
    .in("status", ["open", "fulfilled"])
    .order("created_at", { ascending: false })
    .limit(200);
  if (res.error) {
    const missing = res.error.code === "42P01" || res.error.code === "PGRST205" || /song_requests/.test(res.error.message);
    return (
      <>
        {header}
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">
          {missing ? "Song requests need the latest database update, which hasn't been run yet." : "Couldn't load the requests. Please try again."}
        </p>
      </>
    );
  }

  const rows = (res.data ?? []).filter((r) => r.status === "open" || (r.fulfilled_at && r.fulfilled_at >= since));
  const ids = [...new Set(rows.flatMap((r) => [r.requester_id as string, r.fulfilled_by as string | null]).filter((x): x is string => Boolean(x)))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id as string, p.display_name as string | null]));

  const list: RequestRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    coverUrl: r.cover_url,
    status: r.status === "fulfilled" ? "fulfilled" : "open",
    songId: r.song_id,
    mine: r.requester_id === user.id,
    requesterName: name.get(r.requester_id) ?? null,
    fulfilledByName: r.fulfilled_by ? (name.get(r.fulfilled_by) ?? null) : null,
    createdAt: r.created_at,
  }));

  return (
    <>
      {header}
      <RequestsList requests={list} />
    </>
  );
}
