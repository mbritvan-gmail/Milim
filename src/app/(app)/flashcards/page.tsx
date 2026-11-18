import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StudyFilter } from "@/lib/study";
import { readAllRows } from "@/lib/paged";
import { loadLearnedIds, loadSources, type Source } from "@/lib/word-sources";
import { StudyPicker, type PickOption } from "./study-picker";

export const metadata = { title: "Flash Cards · milim" };

type SearchParams = Promise<{ filter?: string; song?: string; module?: string; scope?: string }>;

// The Flash Cards home: a page of its own, like Songs and Vocabulary. A study session opens over it as a pop-up
// (`/study`), so closing a session returns here.
export default function FlashcardsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <FlashcardsBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function FlashcardsBody({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Old study links (/flashcards?filter=...) now live at /study.
  if (params.filter || params.song || params.module) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    redirect(`/study?${q.toString()}`);
  }
  return <FlashcardsHub userId={user.id} />;
}

// Counts how many words are in each group and links to a study session for it.
async function FlashcardsHub({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [sources, learned] = await Promise.all([loadSources(supabase, userId), loadLearnedIds(supabase)]);
  const toOption = (s: Source): PickOption => ({ id: s.id, title: s.title, total: s.words.length, unlearned: s.words.filter((w) => !learned.has(w)).length });
  // Only Songs and Packs that have words to practise.
  const songOptions = sources.songs.map(toOption).filter((o) => o.total > 0);
  const packOptions = sources.packs.map(toOption).filter((o) => o.total > 0);
  const { data } = await readAllRows((a, b) => supabase.from("master_dictionary").select("status").order("vocab_entry_id").range(a, b));
  const counts = { new: 0, learning: 0, learned: 0 };
  for (const r of data) {
    const k = r.status as keyof typeof counts;
    if (k in counts) counts[k] += 1;
  }
  const total = counts.new + counts.learning + counts.learned;
  const groups: { filter: StudyFilter; label: string; count: number }[] = [
    { filter: "new", label: "New words", count: counts.new },
    { filter: "learning", label: "Still learning", count: counts.learning },
    { filter: "learned", label: "Learned words", count: counts.learned },
    { filter: "all", label: "All words", count: total },
  ];
  return (
    <>
      <h1 className="text-2xl font-semibold">Flash Cards</h1>
      {total === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">
          No words yet. Add a song and its vocabulary shows up here.
        </p>
      ) : (
        <>
        <section className="flex flex-col gap-2" aria-label="My words">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">My words</h2>
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li key={g.filter}>
              {g.count > 0 ? (
                <Link
                  href={`/study?filter=${g.filter}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-4 hover:bg-surface-2"
                >
                  <span className="font-medium">{g.label}</span>
                  <span className="text-muted">{g.count}</span>
                </Link>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-border px-4 py-4 text-muted">
                  <span>{g.label}</span>
                  <span>0</span>
                </div>
              )}
            </li>
          ))}
        </ul>
        </section>
        <StudyPicker songs={songOptions} packs={packOptions} />
        </>
      )}
    </>
  );
}
