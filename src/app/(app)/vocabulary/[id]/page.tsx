import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { chunk, fingerprint } from "@/lib/study";
import { ModuleView, type ModuleActions, type ModuleRow } from "./module-view";
import { addModule, addModuleWords, makeModulePublic, removeModule, removeModuleWord, renameModule, reorderModuleWords, restoreModuleWord } from "../actions";

export const metadata = { title: "Module · milim" };

// Looking up new words with the AI can take a little while.
export const maxDuration = 60;

// Server actions handed to the screen as a plain object (so tests can swap in stand-ins).
const actions: ModuleActions = { reorderModuleWords, addModule, makeModulePublic, removeModule, renameModule, removeModuleWord, restoreModuleWord, addModuleWords };

export default function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <ModuleBody params={params} />
      </Suspense>
    </main>
  );
}

async function ModuleBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [moduleRes, wordsRes, mineRes, settings] = await Promise.all([
    supabase.from("modules").select("id, title, owner_id, visibility, archived_at").eq("id", id).maybeSingle(),
    supabase
      .from("module_words")
      .select("position, vocab_entries(id, lemma, vocalized, transliteration, english, part_of_speech, gender, plural)")
      .eq("module_id", id)
      .order("position"),
    supabase.from("user_modules").select("module_id").eq("module_id", id).maybeSingle(),
    loadSettings(supabase, user.id),
  ]);
  if (moduleRes.error) throw new Error(`module lookup failed: ${moduleRes.error.message}`);
  const mod = moduleRes.data;
  if (!mod) notFound();

  const entries = (wordsRes.data ?? []).flatMap((row) => {
    const v = Array.isArray(row.vocab_entries) ? row.vocab_entries[0] : row.vocab_entries;
    return v ? [v] : [];
  });
  const progress = new Map<string, { correct_count: number; learned_at: string | null }>();
  for (const ids of chunk(entries.map((e) => e.id as string), 60)) {
    const { data } = await supabase.from("user_words").select("vocab_entry_id, correct_count, learned_at").in("vocab_entry_id", ids);
    for (const p of data ?? []) progress.set(p.vocab_entry_id, p);
  }
  const words: ModuleRow[] = entries.map((e) => {
    const p = progress.get(e.id);
    return {
      id: e.id,
      lemma: e.lemma,
      vocalized: e.vocalized ?? null,
      transliteration: e.transliteration ?? null,
      english: e.english,
      partOfSpeech: e.part_of_speech ?? null,
      gender: e.gender ?? null,
      plural: e.plural ?? null,
      status: p ? (p.learned_at ? "learned" : "learning") : "new",
      count: p?.correct_count ?? 0,
    };
  });

  const isOwner = mod.owner_id === user.id;
  let by = "Private";
  if (mod.visibility === "public") {
    if (isOwner) by = "Shared by you";
    else {
      const { data: owner } = await supabase.from("profiles").select("display_name").eq("id", mod.owner_id).maybeSingle();
      by = `Shared by ${owner?.display_name ?? "someone"}`;
    }
  }

  return (
    <ModuleView
      key={fingerprint([
        mod.title,
        mod.visibility,
        Boolean(mineRes.data),
        settings.showTranslit,
        settings.showNikud,
        settings.learnAfter,
        ...words.flatMap((w) => [w.id, w.status, w.count]),
      ])}
      moduleId={mod.id}
      title={mod.title}
      isOwner={isOwner}
      isPublic={mod.visibility === "public"}
      added={Boolean(mineRes.data)}
      archived={Boolean(mod.archived_at)}
      by={by}
      words={words}
      showTranslit={settings.showTranslit}
      showNikud={settings.showNikud}
      learnAfter={settings.learnAfter}
      actions={actions}
    />
  );
}
