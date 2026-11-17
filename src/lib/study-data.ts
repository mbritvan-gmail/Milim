import type { SupabaseClient } from "@supabase/supabase-js";
import { loadWordExtras } from "./word-extras";
import { chunk, matchesFilter, shuffle, type SessionCard, type StudyFilter, type WordStatus } from "./study";

// Loads the cards for a study session. A web address can only hold so many ids, so anything
// looked up by a long list of ids is fetched in chunks.
const CHUNK = 60;

type BaseCard = Omit<SessionCard, "context"> & { lineId: string | null; songId: string | null };
type VocabRow = { id: string; lemma: string; transliteration: string | null; english: string; part_of_speech: string | null };

function statusOf(row: { learned_at: string | null } | undefined): WordStatus {
  if (!row) return "new";
  return row.learned_at ? "learned" : "learning";
}

// Attach a lyric line (and the song it comes from) to each card, as a reminder of where the word was heard.
async function withContext(supabase: SupabaseClient, base: BaseCard[]): Promise<SessionCard[]> {
  const extras = await loadWordExtras(supabase, base.map((c) => c.vocabId));
  const lineByVocab = new Map<string, { lineId: string; songId: string | null }>();
  for (const c of base) if (c.lineId) lineByVocab.set(c.vocabId, { lineId: c.lineId, songId: c.songId });

  const needLines = base.filter((c) => !c.lineId).map((c) => c.vocabId);
  for (const ids of chunk(needLines, CHUNK)) {
    const { data } = await supabase
      .from("song_words")
      .select("vocab_entry_id, line_id, song_id")
      .in("vocab_entry_id", ids)
      .not("line_id", "is", null);
    for (const r of data ?? []) {
      if (!lineByVocab.has(r.vocab_entry_id)) lineByVocab.set(r.vocab_entry_id, { lineId: r.line_id, songId: r.song_id });
    }
  }

  const lineById = new Map<string, { hebrew: string; transliteration: string | null }>();
  for (const ids of chunk([...new Set([...lineByVocab.values()].map((v) => v.lineId))], CHUNK)) {
    const { data } = await supabase.from("lines").select("id, hebrew, transliteration").in("id", ids);
    for (const l of data ?? []) lineById.set(l.id, { hebrew: l.hebrew, transliteration: l.transliteration ?? null });
  }

  const titleById = new Map<string, string>();
  const songIds = [...new Set([...lineByVocab.values()].map((v) => v.songId).filter((x): x is string => Boolean(x)))];
  for (const ids of chunk(songIds, CHUNK)) {
    const { data } = await supabase.from("songs").select("id, title").in("id", ids);
    for (const s of data ?? []) titleById.set(s.id, s.title);
  }

  return base.map(({ lineId, songId, ...card }) => {
    void lineId;
    void songId;
    const found = lineByVocab.get(card.vocabId);
    const line = found ? lineById.get(found.lineId) : undefined;
    return {
      ...card,
      ...extras.get(card.vocabId),
      context: line ? { songTitle: found?.songId ? (titleById.get(found.songId) ?? null) : null, ...line } : null,
    };
  });
}

// Every word the person has met (the Master Dictionary), narrowed by status.
export async function cardsForFilter(supabase: SupabaseClient, filter: StudyFilter): Promise<SessionCard[]> {
  const { data } = await supabase
    .from("master_dictionary")
    .select("vocab_entry_id, lemma, transliteration, english, part_of_speech, correct_count, status")
    .limit(3000);
  const rows = (data ?? []) as {
    vocab_entry_id: string; lemma: string; transliteration: string | null; english: string;
    part_of_speech: string | null; correct_count: number | null; status: WordStatus;
  }[];
  const base: BaseCard[] = rows
    .filter((r) => matchesFilter(r.status, filter))
    .map((r) => ({
      vocabId: r.vocab_entry_id,
      lemma: r.lemma,
      transliteration: r.transliteration,
      english: r.english,
      partOfSpeech: r.part_of_speech,
      status: r.status,
      count: r.correct_count ?? 0,
      lineId: null,
      songId: null,
    }));
  return withContext(supabase, shuffle(base));
}

// One song's words. `scope` narrows to the words still to learn, or to the learned ones.
export async function cardsForSong(
  supabase: SupabaseClient,
  songId: string,
  scope: "unlearned" | "learned" | "all",
): Promise<{ title: string; cards: SessionCard[] } | null> {
  const [songRes, wordsRes] = await Promise.all([
    supabase.from("songs").select("id, title").eq("id", songId).maybeSingle(),
    supabase
      .from("song_words")
      .select("line_id, vocab_entries(id, lemma, transliteration, english, part_of_speech)")
      .eq("song_id", songId),
  ]);
  if (!songRes.data) return null;

  const entries = (wordsRes.data ?? []).flatMap((row) => {
    const v = (Array.isArray(row.vocab_entries) ? row.vocab_entries[0] : row.vocab_entries) as VocabRow | undefined;
    return v ? [{ v, lineId: row.line_id as string | null }] : [];
  });

  const progress = new Map<string, { correct_count: number; learned_at: string | null }>();
  for (const ids of chunk(entries.map((e) => e.v.id), CHUNK)) {
    const { data } = await supabase.from("user_words").select("vocab_entry_id, correct_count, learned_at").in("vocab_entry_id", ids);
    for (const p of data ?? []) progress.set(p.vocab_entry_id, p);
  }

  const base: BaseCard[] = entries
    .map((e) => {
      const p = progress.get(e.v.id);
      return {
        vocabId: e.v.id,
        lemma: e.v.lemma,
        transliteration: e.v.transliteration,
        english: e.v.english,
        partOfSpeech: e.v.part_of_speech,
        status: statusOf(p),
        count: p?.correct_count ?? 0,
        lineId: e.lineId,
        songId,
      };
    })
    .filter((c) => (scope === "all" ? true : scope === "learned" ? c.status === "learned" : c.status !== "learned"));
  return { title: songRes.data.title, cards: await withContext(supabase, shuffle(base)) };
}

// One vocabulary module's words. `scope` narrows to the words still to learn, or to the learned ones.
export async function cardsForModule(
  supabase: SupabaseClient,
  moduleId: string,
  scope: "unlearned" | "learned" | "all",
): Promise<{ title: string; cards: SessionCard[] } | null> {
  const [moduleRes, wordsRes] = await Promise.all([
    supabase.from("modules").select("id, title").eq("id", moduleId).maybeSingle(),
    supabase
      .from("module_words")
      .select("position, vocab_entries(id, lemma, transliteration, english, part_of_speech)")
      .eq("module_id", moduleId),
  ]);
  if (!moduleRes.data) return null;

  const entries = (wordsRes.data ?? []).flatMap((row) => {
    const v = (Array.isArray(row.vocab_entries) ? row.vocab_entries[0] : row.vocab_entries) as VocabRow | undefined;
    return v ? [v] : [];
  });

  const progress = new Map<string, { correct_count: number; learned_at: string | null }>();
  for (const ids of chunk(entries.map((e) => e.id), CHUNK)) {
    const { data } = await supabase.from("user_words").select("vocab_entry_id, correct_count, learned_at").in("vocab_entry_id", ids);
    for (const p of data ?? []) progress.set(p.vocab_entry_id, p);
  }

  const base: BaseCard[] = entries
    .map((v) => {
      const p = progress.get(v.id);
      return {
        vocabId: v.id,
        lemma: v.lemma,
        transliteration: v.transliteration,
        english: v.english,
        partOfSpeech: v.part_of_speech,
        status: statusOf(p),
        count: p?.correct_count ?? 0,
        lineId: null,
        songId: null,
      };
    })
    .filter((c) => (scope === "all" ? true : scope === "learned" ? c.status === "learned" : c.status !== "learned"));
  return { title: moduleRes.data.title, cards: await withContext(supabase, shuffle(base)) };
}
