import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { countDue, currentTimeMs } from "@/lib/flashcards";
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

  const nowMs = currentTimeMs();
  const [dictRes, profileRes] = await Promise.all([
    supabase.from("master_dictionary").select("*").limit(3000),
    supabase.from("profiles").select("show_transliteration").eq("id", user.id).maybeSingle(),
  ]);

  const rows = (dictRes.data ?? []) as {
    vocab_entry_id: string; lemma: string; transliteration: string | null; english: string; part_of_speech: string | null;
    leitner_box: number | null; next_due_at: string | null; status: "new" | "learning" | "learned";
  }[];

  const words: DictionaryWord[] = rows
    .map((r) => ({
      vocabId: r.vocab_entry_id,
      lemma: r.lemma,
      transliteration: r.transliteration,
      english: r.english,
      partOfSpeech: r.part_of_speech,
      status: r.status,
      box: r.leitner_box,
    }))
    .sort((a, b) => a.lemma.localeCompare(b.lemma, "he"));

  const due = countDue(rows, nowMs);

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

      {words.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/flashcards"
            className="flex h-12 flex-col items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-contrast hover:bg-accent-strong"
          >
            Review cards
            {due > 0 && <span className="text-xs font-normal opacity-80">{due} due</span>}
          </Link>
          <Link
            href="/flashcards?mode=all"
            className="flex h-12 items-center justify-center rounded-xl border border-border text-sm font-semibold hover:bg-surface-2"
          >
            Practice anything
          </Link>
        </div>
      )}

      <DictionaryList initialWords={words} initialShowTranslit={profileRes.data?.show_transliteration ?? true} />
    </>
  );
}
