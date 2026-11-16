import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildOptions, pickQuizWords } from "@/lib/quiz";
import { QuizRunner, type QuizQuestion } from "./quiz-runner";

export const metadata = { title: "Quiz · Milim" };

// Preparing wrong answers with the AI can take a little while the first time.
export const maxDuration = 60;

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading quiz…</p>}>
        <QuizBody params={params} />
      </Suspense>
    </main>
  );
}

type Vocab = { id: string; lemma: string; transliteration: string | null; english: string };

async function QuizBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [songRes, wordsRes, linesRes, profileRes] = await Promise.all([
    supabase.from("songs").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("song_words").select("line_id, vocab_entries(id, lemma, transliteration, english)").eq("song_id", id),
    supabase.from("lines").select("id, hebrew, transliteration").eq("song_id", id),
    supabase.from("profiles").select("show_transliteration").eq("id", user.id).maybeSingle(),
  ]);
  const song = songRes.data;
  if (!song) notFound();

  const entries = (wordsRes.data ?? []).flatMap((row) => {
    const v = (Array.isArray(row.vocab_entries) ? row.vocab_entries[0] : row.vocab_entries) as Vocab | undefined;
    return v ? [{ vocab: v, lineId: row.line_id as string | null }] : [];
  });
  const lineById = new Map((linesRes.data ?? []).map((l) => [l.id, l]));
  const ids = entries.map((e) => e.vocab.id);

  const [optionsRes, progressRes, poolRes] = await Promise.all([
    ids.length ? supabase.from("quiz_options").select("vocab_entry_id, option_text").in("vocab_entry_id", ids) : { data: [] },
    ids.length ? supabase.from("user_words").select("vocab_entry_id, learned_at").in("vocab_entry_id", ids) : { data: [] },
    supabase.from("vocab_entries").select("english").limit(400),
  ]);

  const distractors = new Map<string, string[]>();
  for (const o of optionsRes.data ?? []) {
    distractors.set(o.vocab_entry_id, [...(distractors.get(o.vocab_entry_id) ?? []), o.option_text]);
  }
  const learned = new Set((progressRes.data ?? []).filter((p) => p.learned_at).map((p) => p.vocab_entry_id));
  const pool = (poolRes.data ?? []).map((p) => p.english as string);

  const chosen = pickQuizWords(entries.map((e) => ({ ...e, learned: learned.has(e.vocab.id) })));

  const questions: QuizQuestion[] = chosen
    .map((e) => {
      const line = e.lineId ? lineById.get(e.lineId) : undefined;
      return {
        vocabId: e.vocab.id,
        lemma: e.vocab.lemma,
        transliteration: e.vocab.transliteration,
        answer: e.vocab.english,
        options: buildOptions(e.vocab.english, distractors.get(e.vocab.id) ?? [], pool),
        clue: line ? { hebrew: line.hebrew as string, transliteration: (line.transliteration as string | null) ?? null } : null,
      };
    })
    // A question needs at least two choices to be a quiz.
    .filter((q) => q.options.length >= 2);

  return (
    <>
      <header className="flex flex-col gap-1">
        <Link href={`/songs/${id}`} className="text-sm text-muted underline underline-offset-4">
          ← Back to song
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Quiz: {song.title}</h1>
      </header>
      {questions.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">
          This song doesn&apos;t have enough key words for a quiz yet.
        </p>
      ) : (
        <QuizRunner songId={id} questions={questions} showTranslit={profileRes.data?.show_transliteration ?? true} />
      )}
    </>
  );
}
