import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SONG_SESSION_SIZE, countDue, currentTimeMs, selectAny, selectDueSession } from "@/lib/flashcards";
import { FlashcardRunner, type Flashcard } from "./flashcard-runner";

export const metadata = { title: "Flashcards · milim" };

type SearchParams = Promise<{ mode?: string; song?: string }>;

export default function FlashcardsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading cards…</p>}>
        <FlashcardsBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type Vocab = { id: string; lemma: string; transliteration: string | null; english: string; part_of_speech: string | null };
type Candidate = Flashcard & { _lineId: string | null };

async function FlashcardsBody({ searchParams }: { searchParams: SearchParams }) {
  const { mode, song: songId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nowMs = currentTimeMs();
  const profileRes = await supabase.from("profiles").select("show_transliteration").eq("id", user.id).maybeSingle();
  const showTranslit = profileRes.data?.show_transliteration ?? true;

  let title = "Flashcards";
  let subtitle = "";
  let candidates: Candidate[] = [];
  let emptyMessage = "";
  let dueCount = 0;

  if (songId) {
    // One song's words, in a random order, whether or not they're due.
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(songId)) notFound();
    const [songRes, wordsRes] = await Promise.all([
      supabase.from("songs").select("id, title").eq("id", songId).maybeSingle(),
      supabase.from("song_words").select("line_id, vocab_entries(id, lemma, transliteration, english, part_of_speech)").eq("song_id", songId),
    ]);
    if (!songRes.data) notFound();
    title = "Song flashcards";
    subtitle = songRes.data.title;
    const entries = (wordsRes.data ?? []).flatMap((row) => {
      const v = (Array.isArray(row.vocab_entries) ? row.vocab_entries[0] : row.vocab_entries) as Vocab | undefined;
      return v ? [{ v, lineId: row.line_id as string | null }] : [];
    });
    const progress = entries.length
      ? await supabase.from("user_words").select("vocab_entry_id, leitner_box").in("vocab_entry_id", entries.map((e) => e.v.id))
      : { data: [] };
    const boxById = new Map((progress.data ?? []).map((p) => [p.vocab_entry_id as string, p.leitner_box as number]));
    candidates = selectAny(
      entries.map((e) => ({
        vocabId: e.v.id,
        lemma: e.v.lemma,
        transliteration: e.v.transliteration,
        english: e.v.english,
        partOfSpeech: e.v.part_of_speech,
        box: boxById.get(e.v.id) ?? null,
        context: null,
        _lineId: e.lineId,
      })),
      SONG_SESSION_SIZE,
    );
    emptyMessage = "This song has no key words yet.";
  } else {
    const { data: dict } = await supabase.from("master_dictionary").select("*").limit(3000);
    const rows = (dict ?? []) as {
      vocab_entry_id: string; lemma: string; transliteration: string | null; english: string; part_of_speech: string | null;
      leitner_box: number | null; next_due_at: string | null; status: "new" | "learning" | "learned";
    }[];
    dueCount = countDue(rows, nowMs);
    const chosen = mode === "all" ? selectAny(rows) : selectDueSession(rows, nowMs);
    title = mode === "all" ? "Practice anything" : "Flashcards";
    subtitle = mode === "all" ? "A random mix of all your words" : dueCount > 0 ? `${dueCount} due for review` : "";
    candidates = chosen.map((r) => ({
      vocabId: r.vocab_entry_id,
      lemma: r.lemma,
      transliteration: r.transliteration,
      english: r.english,
      partOfSpeech: r.part_of_speech,
      box: r.status === "new" ? null : r.leitner_box,
      context: null,
      _lineId: null,
    }));
    emptyMessage =
      rows.length === 0
        ? "Add a song first. Its key words will show up here to practice."
        : "You're all caught up! Nothing is due for review right now.";
  }

  // Attach a lyric line to each card, as a reminder of where the word was heard.
  if (candidates.length > 0) {
    const needLines = candidates.filter((c) => !c._lineId).map((c) => c.vocabId);
    const lineByVocab = new Map<string, string>();
    for (const c of candidates) if (c._lineId) lineByVocab.set(c.vocabId, c._lineId);
    if (needLines.length > 0) {
      const { data: sw } = await supabase.from("song_words").select("vocab_entry_id, line_id").in("vocab_entry_id", needLines).not("line_id", "is", null);
      for (const r of sw ?? []) if (!lineByVocab.has(r.vocab_entry_id)) lineByVocab.set(r.vocab_entry_id, r.line_id);
    }
    const lineIds = [...new Set(lineByVocab.values())];
    const { data: lines } = lineIds.length
      ? await supabase.from("lines").select("id, hebrew, transliteration").in("id", lineIds)
      : { data: [] };
    const lineById = new Map((lines ?? []).map((l) => [l.id as string, l]));
    for (const c of candidates) {
      const line = lineById.get(lineByVocab.get(c.vocabId) ?? "");
      if (line) c.context = { hebrew: line.hebrew, transliteration: line.transliteration ?? null };
    }
  }

  const cards: Flashcard[] = candidates.map((c) => ({
    vocabId: c.vocabId,
    lemma: c.lemma,
    transliteration: c.transliteration,
    english: c.english,
    partOfSpeech: c.partOfSpeech,
    box: c.box,
    context: c.context,
  }));

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </header>

      {cards.length === 0 ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-lg font-medium">{emptyMessage}</p>
          <div className="flex flex-col gap-2">
            <Link href="/flashcards?mode=all" className="flex h-11 items-center justify-center rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong">
              Practice anything anyway
            </Link>
            <Link href="/songs" className="flex h-11 items-center justify-center rounded-xl border border-border hover:bg-surface-2">
              Back to songs
            </Link>
          </div>
        </div>
      ) : (
        <FlashcardRunner cards={cards} showTranslit={showTranslit} />
      )}
    </>
  );
}
