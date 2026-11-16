"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { sameAnswer } from "@/lib/quiz";

type VocabRow = { id: string; lemma: string; english: string; part_of_speech: string | null };

function firstEntry<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

// Make sure every key word of the song has wrong answers saved, then open the quiz.
// The AI writes them once per word; they're shared and reused. If the AI is slow or
// unavailable the quiz still works, borrowing wrong answers from other words.
export async function prepareQuiz(songId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("song_words")
    .select("vocab_entries(id, lemma, english, part_of_speech)")
    .eq("song_id", songId);
  const words = (rows ?? []).flatMap((r) => {
    const v = firstEntry<VocabRow>(r.vocab_entries as VocabRow | VocabRow[] | null);
    return v ? [v] : [];
  });
  if (words.length === 0) redirect(`/songs/${songId}`);

  const { data: existing } = await supabase
    .from("quiz_options")
    .select("vocab_entry_id")
    .in("vocab_entry_id", words.map((w) => w.id));
  const counts = new Map<string, number>();
  for (const e of existing ?? []) counts.set(e.vocab_entry_id, (counts.get(e.vocab_entry_id) ?? 0) + 1);
  const missing = words.filter((w) => (counts.get(w.id) ?? 0) < 3);

  if (missing.length > 0) {
    try {
      const distractors = await getAIProvider().generateDistractors(missing);
      const toInsert = missing.flatMap((w, i) =>
        (distractors[i] ?? []).slice(0, 4).map((option_text) => ({ vocab_entry_id: w.id, option_text: option_text.trim() })),
      );
      if (toInsert.length > 0) {
        await supabase
          .from("quiz_options")
          .upsert(toInsert.filter((r) => r.option_text), { onConflict: "vocab_entry_id,option_text", ignoreDuplicates: true });
      }
    } catch (error) {
      // Not fatal: the quiz falls back to answers borrowed from other words.
      console.error("prepareQuiz: distractors failed", error);
    }
  }

  redirect(`/songs/${songId}/quiz`);
}

export type QuizAnswer = { vocabId: string; chosen: string };
export type QuizResult = {
  score: number;
  total: number;
  results: { vocabId: string; lemma: string; chosen: string; correctAnswer: string; correct: boolean }[];
};

// Grade a finished quiz on the server (never trust the browser's marking), save the
// attempt, and update the user's Leitner progress for every word answered.
export async function submitQuiz(
  songId: string,
  answers: QuizAnswer[],
): Promise<QuizResult | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const { data: rows } = await supabase
    .from("song_words")
    .select("vocab_entry_id, vocab_entries(lemma, english)")
    .eq("song_id", songId);
  const truth = new Map<string, { lemma: string; english: string }>();
  for (const r of rows ?? []) {
    const v = firstEntry<{ lemma: string; english: string }>(
      r.vocab_entries as { lemma: string; english: string } | { lemma: string; english: string }[] | null,
    );
    if (v) truth.set(r.vocab_entry_id, v);
  }

  // Keep one answer per word that really belongs to this song.
  const seen = new Set<string>();
  const valid = answers
    .filter((a) => truth.has(a.vocabId) && !seen.has(a.vocabId) && seen.add(a.vocabId))
    .slice(0, 50);
  if (valid.length === 0) return { error: "No answers to save." };

  const results = valid.map((a) => {
    const t = truth.get(a.vocabId)!;
    return {
      vocabId: a.vocabId,
      lemma: t.lemma,
      chosen: String(a.chosen ?? "").slice(0, 200),
      correctAnswer: t.english,
      correct: sameAnswer(String(a.chosen ?? ""), t.english),
    };
  });
  const score = results.filter((r) => r.correct).length;

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({ user_id: user.id, song_id: songId, score, total: results.length })
    .select("id")
    .single();
  if (attemptError || !attempt) {
    console.error("submitQuiz: attempt insert failed", attemptError);
    return { error: "Couldn't save your quiz. Please try again." };
  }

  const { error: answersError } = await supabase.from("quiz_answers").insert(
    results.map((r) => ({ attempt_id: attempt.id, vocab_entry_id: r.vocabId, chosen: r.chosen, correct: r.correct })),
  );
  if (answersError) console.error("submitQuiz: answers insert failed", answersError);

  // Leitner boxes + "learned after 3 correct answers" are handled in the database.
  const progress = await Promise.all(
    results.map((r) => supabase.rpc("record_answer", { p_vocab_entry_id: r.vocabId, p_correct: r.correct })),
  );
  for (const p of progress) if (p.error) console.error("submitQuiz: record_answer failed", p.error);

  return { score, total: results.length, results };
}
