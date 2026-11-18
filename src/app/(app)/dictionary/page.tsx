import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { fingerprint, type WordStatus } from "@/lib/study";
import { readAllRows } from "@/lib/paged";
import { loadSources, sourceNote, sourcesByWord } from "@/lib/word-sources";
import { DictionaryList, type DictionaryWord } from "./dictionary-list";

export const metadata = { title: "Dictionary · milim" };

export default function DictionaryPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading your words…</p>}>
        <DictionaryBody />
      </Suspense>
    </main>
  );
}

async function DictionaryBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [dictRes, settings, sources, nikudRes] = await Promise.all([
    readAllRows((a, b) =>
      supabase
        .from("master_dictionary")
        .select("vocab_entry_id, lemma, transliteration, english, part_of_speech, correct_count, status")
        .order("vocab_entry_id")
        .range(a, b),
    ),
    loadSettings(supabase, user.id),
    loadSources(supabase, user.id),
    // Which words have nikud saved (the column is newer; if it isn't there yet this just comes back empty).
    readAllRows<{ id: string; vocalized: string }>((a, b) => supabase.from("vocab_entries").select("id, vocalized").not("vocalized", "is", null).order("id").range(a, b)),
  ]);
  const found = sourcesByWord(sources);
  const nikud = new Map(nikudRes.data.map((r) => [r.id, r.vocalized]));

  const rows = dictRes.data as {
    vocab_entry_id: string; lemma: string; transliteration: string | null; english: string;
    part_of_speech: string | null; correct_count: number | null; status: WordStatus;
  }[];

  const words: DictionaryWord[] = rows
    .map((r) => ({
      vocabId: r.vocab_entry_id,
      lemma: r.lemma,
      transliteration: r.transliteration,
      english: r.english,
      partOfSpeech: r.part_of_speech,
      note: sourceNote(r.part_of_speech, found.get(r.vocab_entry_id)),
      vocalized: nikud.get(r.vocab_entry_id) ?? null,
      status: r.status,
      count: r.correct_count ?? 0,
    }))
    .sort((a, b) => a.lemma.localeCompare(b.lemma, "he"));

  return (
    <>
      <header>
        <div>
          <h1 className="text-2xl font-semibold">Dictionary</h1>
          <p className="text-sm text-muted">
            {words.length === 0
              ? "Every word from your songs, in one place."
              : `${words.length} ${words.length === 1 ? "word" : "words"} from your songs`}
          </p>
        </div>
      </header>
      <DictionaryList
        key={fingerprint([settings.showTranslit, settings.learnAfter, settings.showNikud, ...words.flatMap((w) => [w.vocabId, w.status, w.count, w.note, w.vocalized ?? ""])])}
        initialWords={words}
        showTranslit={settings.showTranslit}
        showNikud={settings.showNikud}
        learnAfter={settings.learnAfter}
      />
    </>
  );
}
