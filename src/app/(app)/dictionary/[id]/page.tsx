import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { chunk } from "@/lib/study";
import { WordCardBack } from "@/components/word-card-back";
import { WordActions } from "./word-actions";
import { FormsButton } from "@/components/word-forms";
import { formsKind } from "@/lib/word-forms";
import { loadWordExtras } from "@/lib/word-extras";

export const metadata = { title: "Word · milim" };

// Working out a verb's forms the first time can take a little while.
export const maxDuration = 60;

export default function WordPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <WordBody params={params} />
      </Suspense>
    </main>
  );
}

async function WordBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [vocabRes, progressRes, usesRes, settings] = await Promise.all([
    supabase.from("vocab_entries").select("id, lemma, transliteration, english, part_of_speech").eq("id", id).maybeSingle(),
    supabase.from("user_words").select("correct_count, learned_at").eq("vocab_entry_id", id).maybeSingle(),
    supabase.from("song_words").select("song_id, line_id").eq("vocab_entry_id", id).limit(6),
    loadSettings(supabase, user.id),
  ]);
  if (vocabRes.error) throw new Error(`word lookup failed: ${vocabRes.error.message}`);
  const word = vocabRes.data;
  if (!word) notFound();

  // Up to a few lyric lines where the word was heard, with the song each came from.
  const uses = usesRes.data ?? [];
  const lineIds = uses.map((u) => u.line_id as string | null).filter((x): x is string => Boolean(x));
  const songIds = [...new Set(uses.map((u) => u.song_id as string))];
  const [linesRes, songsRes] = await Promise.all([
    lineIds.length ? supabase.from("lines").select("id, hebrew, transliteration").in("id", chunk(lineIds, 60)[0]) : { data: [] },
    songIds.length ? supabase.from("songs").select("id, title").in("id", chunk(songIds, 60)[0]) : { data: [] },
  ]);
  const lineById = new Map((linesRes.data ?? []).map((l) => [l.id as string, l]));
  const titleById = new Map((songsRes.data ?? []).map((s) => [s.id as string, s.title as string]));
  const heard = uses.flatMap((u) => {
    const line = u.line_id ? lineById.get(u.line_id) : undefined;
    return line ? [{ songId: u.song_id as string, title: titleById.get(u.song_id as string) ?? "A song", line }] : [];
  });

  const extras = (await loadWordExtras(supabase, [word.id])).get(word.id);
  const status = progressRes.data ? (progressRes.data.learned_at ? "learned" : "learning") : "new";

  return (
    <>
      {/* The same card as the back of a flashcard; its status and buttons live just below. */}
      <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-surface p-5 text-center">
        <WordCardBack
          lemma={word.lemma}
          transliteration={word.transliteration}
          english={word.english}
          partOfSpeech={word.part_of_speech}
          vocalized={extras?.vocalized}
          gender={extras?.gender}
          plural={extras?.plural}
          showNikud={settings.showNikud}
          face="he-en"
          showTranslit={settings.showTranslit}
          heardIn={heard.map((h) => ({
            songTitle: h.title,
            hebrew: h.line.hebrew,
            transliteration: h.line.transliteration ?? null,
            href: `/songs/${h.songId}`,
          }))}
          status={status}
          count={progressRes.data?.correct_count ?? 0}
          learnAfter={settings.learnAfter}
          showStatus={false}
        />
      </div>

      {formsKind(word.part_of_speech) && (
        <FormsButton
          vocabId={word.id}
          kind={formsKind(word.part_of_speech)!}
          lemma={word.lemma}
          english={word.english}
          showTranslit={settings.showTranslit}
          showNikud={settings.showNikud}
        />
      )}

      <WordActions
        key={`${word.id}-${status}-${progressRes.data?.correct_count ?? 0}-${settings.learnAfter}`}
        vocabId={word.id}
        initialStatus={status}
        initialCount={progressRes.data?.correct_count ?? 0}
        learnAfter={settings.learnAfter}
      />
    </>
  );
}
