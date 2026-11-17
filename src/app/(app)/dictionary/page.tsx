import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import type { WordStatus } from "@/lib/study";
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

  const [dictRes, settings] = await Promise.all([
    supabase
      .from("master_dictionary")
      .select("vocab_entry_id, lemma, transliteration, english, part_of_speech, correct_count, status")
      .limit(3000),
    loadSettings(supabase, user.id),
  ]);

  const rows = (dictRes.data ?? []) as {
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
      status: r.status,
      count: r.correct_count ?? 0,
    }))
    .sort((a, b) => a.lemma.localeCompare(b.lemma, "he"));

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Dictionary</h1>
        <p className="text-sm text-muted">
          {words.length === 0
            ? "Every word from your songs, in one place."
            : `${words.length} ${words.length === 1 ? "word" : "words"} from your songs`}
        </p>
      </header>
      <DictionaryList initialWords={words} showTranslit={settings.showTranslit} learnAfter={settings.learnAfter} />
    </>
  );
}
