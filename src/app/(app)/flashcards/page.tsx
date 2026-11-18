import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { isStudyFilter, newSessionId, type SessionCard, type StudyFilter } from "@/lib/study";
import { cardsForFilter, cardsForModule, cardsForSong } from "@/lib/study-data";
import { StudyRunner } from "./study-runner";
import { CloseOrLink } from "@/components/overlay";
import { readAllRows } from "@/lib/paged";

export const metadata = { title: "Study · milim" };

// Working out a verb's forms the first time can take a little while.
export const maxDuration = 60;

type SearchParams = Promise<{ filter?: string; song?: string; module?: string; scope?: string }>;

export default function StudyPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Suspense fallback={<p className="text-center text-muted">Loading cards…</p>}>
        <StudyBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAMES: Record<StudyFilter, string> = {
  new: "new words",
  learning: "learning words",
  learned: "learned words",
  all: "words",
};

async function StudyBody({ searchParams }: { searchParams: SearchParams }) {
  const { filter: rawFilter, song, module: moduleId, scope: rawScope } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // With nothing chosen yet, this is the Flash Cards home: pick which words to study.
  if (!rawFilter && !song && !moduleId) return <FlashcardsHub />;

  const settings = await loadSettings(supabase, user.id);

  let cards: SessionCard[] = [];
  let studyName = "words";
  let backHref = "/dictionary";
  let backLabel = "Back to the Dictionary";

  if (moduleId) {
    if (!uuid.test(moduleId)) notFound();
    const scope = rawScope === "learned" ? "learned" : rawScope === "all" ? "all" : "unlearned";
    const result = await cardsForModule(supabase, moduleId, scope);
    if (!result) notFound();
    cards = result.cards;
    studyName = scope === "learned" ? "this Pack's learned words" : "this Pack";
    backHref = `/vocabulary/${moduleId}`;
    backLabel = "Back to the Pack";
  } else if (song) {
    if (!uuid.test(song)) notFound();
    const scope = rawScope === "learned" ? "learned" : rawScope === "all" ? "all" : "unlearned";
    const result = await cardsForSong(supabase, song, scope);
    if (!result) notFound();
    cards = result.cards;
    studyName = scope === "learned" ? "this song's learned words" : "this song";
    backHref = `/songs/${song}`;
    backLabel = "Back to the song";
  } else {
    const filter: StudyFilter = isStudyFilter(rawFilter) ? rawFilter : "new";
    cards = await cardsForFilter(supabase, filter);
    studyName = NAMES[filter];
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-lg font-medium">Nothing left in {studyName}.</p>
        <CloseOrLink href={backHref} className="flex h-11 items-center justify-center rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong">
          {backLabel}
        </CloseOrLink>
      </div>
    );
  }

  return (
    <StudyRunner
      key={newSessionId()}
      cards={cards}
      learnAfter={settings.learnAfter}
      defaultDirection={settings.direction}
      showTranslit={settings.showTranslit}
      showNikud={settings.showNikud}
      backHref={backHref}
      backLabel={backLabel}
      studyName={studyName}
    />
  );
}

// Counts how many words are in each group and links to a study session for it.
async function FlashcardsHub() {
  const supabase = await createClient();
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
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li key={g.filter}>
              {g.count > 0 ? (
                <Link
                  href={`/flashcards?filter=${g.filter}`}
                  replace
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
      )}
    </>
  );
}
