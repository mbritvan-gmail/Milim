import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { isStudyFilter, newSessionId, type SessionCard, type StudyFilter } from "@/lib/study";
import { cardsForFilter, cardsForModule, cardsForSong } from "@/lib/study-data";
import { StudyRunner } from "../flashcards/study-runner";
import { CloseOrLink } from "@/components/overlay";

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

  // Nothing chosen: this is not a session, so go to the Flash Cards page where the person picks what to study.
  if (!rawFilter && !song && !moduleId) redirect("/flashcards");

  const settings = await loadSettings(supabase, user.id);

  let cards: SessionCard[] = [];
  let studyName = "words";
  let backHref = "/flashcards";
  let backLabel = "Back to Flash Cards";

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

