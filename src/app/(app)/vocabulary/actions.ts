"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider, AIError } from "@/lib/ai";
import { cleanGender, MAX_MODULE_TITLE, MAX_MODULE_WORDS, parseWordList, type ModuleWordResult } from "@/lib/modules";

export type CreateModuleState = { error?: string };
export type ModuleWord = {
  id: string;
  lemma: string;
  vocalized: string | null;
  transliteration: string | null;
  english: string;
  partOfSpeech: string | null;
  gender: string | null;
  plural: string | null;
};
type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

// A cost safety net, like the one for songs. Set DAILY_MODULE_LIMIT in Vercel to change it.
const DAILY_MODULE_LIMIT = Number(process.env.DAILY_MODULE_LIMIT) || 50;
const MISSING_TABLES = "Word packs need the latest database update. It hasn't been run yet.";

function isMissingTable(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "42P01" || error.code === "PGRST205" || (/modules|module_words/.test(message) && /exist|schema cache/.test(message));
}

async function signedInUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Asks the AI about each pasted word, then saves them as shared dictionary words and returns the
// dictionary ids in list order. Words that already exist are reused (their blank nikud / gender /
// plural are filled in); repeats within the list are dropped.
async function defineAndSave(supabase: SupabaseClient, title: string, words: string[]): Promise<ModuleWord[]> {
  const results = await getAIProvider().defineWords({ title, words });
  const usable: ModuleWordResult[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    const lemma = r.lemma.trim();
    const english = r.english.trim();
    if (!/[א-ת]/.test(lemma) || !english) continue;
    const key = `${lemma}|${english}`;
    if (seen.has(key)) continue;
    seen.add(key);
    usable.push({ ...r, lemma, english });
  }
  if (usable.length === 0) throw new AIError("Claude couldn't make sense of those words. Check that they are Hebrew and try again.");

  const rows = usable.map((r) => ({
    lemma: r.lemma,
    transliteration: r.transliteration.trim() || null,
    english: r.english,
    part_of_speech: r.part_of_speech.trim() || null,
    vocalized: r.vocalized.trim() || null,
    gender: cleanGender(r.gender),
    plural: r.plural.trim() || null,
  }));
  // New words are inserted with all their details; existing words are left alone here.
  const upsert = await supabase.from("vocab_entries").upsert(rows, { onConflict: "lemma,english", ignoreDuplicates: true });
  if (upsert.error && /vocalized|gender|plural/.test(upsert.error.message)) {
    // The extra columns don't exist yet (database script not run).
    throw new Error(MISSING_TABLES);
  }
  if (upsert.error) throw new Error(`vocab upsert: ${upsert.error.message}`);

  const { data: entries, error: lookupError } = await supabase
    .from("vocab_entries")
    .select("id, lemma, english, transliteration, part_of_speech, vocalized, gender, plural")
    .in("lemma", [...new Set(rows.map((r) => r.lemma))]);
  if (lookupError || !entries) throw new Error(`vocab lookup: ${lookupError?.message}`);
  const byKey = new Map(entries.map((e) => [`${e.lemma}|${e.english}`, e]));

  const out: ModuleWord[] = [];
  const toFill: { id: string; vocalized: string; gender: string; plural: string }[] = [];
  for (const r of rows) {
    const e = byKey.get(`${r.lemma}|${r.english}`);
    if (!e) continue;
    out.push({
      id: e.id,
      lemma: e.lemma,
      vocalized: e.vocalized ?? r.vocalized,
      transliteration: e.transliteration ?? r.transliteration,
      english: e.english,
      partOfSpeech: e.part_of_speech ?? r.part_of_speech,
      gender: e.gender ?? r.gender,
      plural: e.plural ?? r.plural,
    });
    if ((!e.vocalized && r.vocalized) || (!e.gender && r.gender) || (!e.plural && r.plural)) {
      toFill.push({ id: e.id, vocalized: r.vocalized ?? "", gender: r.gender ?? "", plural: r.plural ?? "" });
    }
  }
  if (toFill.length > 0) {
    const { error } = await supabase.rpc("fill_word_extras", { p_items: toFill });
    if (error) console.error("fill_word_extras failed", error);
  }
  return out;
}

type Outcome = { error?: string; moduleId?: string; signedOut?: boolean };

export async function createModule(_prev: CreateModuleState, formData: FormData): Promise<CreateModuleState> {
  let outcome: Outcome;
  try {
    outcome = await runCreateModule(formData);
  } catch (error) {
    console.error("createModule crashed", error);
    return { error: "Something went wrong while saving your pack. Please try again." };
  }
  if (outcome.signedOut) redirect("/login");
  // Replace the form in the history, so closing the new module returns to the list, not the empty form.
  if (outcome.moduleId) redirect(`/vocabulary/${outcome.moduleId}`, RedirectType.replace);
  return { error: outcome.error };
}

async function runCreateModule(formData: FormData): Promise<Outcome> {
  const supabase = await createClient();
  const user = await signedInUser(supabase);
  if (!user) return { signedOut: true };

  const title = String(formData.get("title") ?? "").trim();
  const makePublic = formData.get("visibility") === "public";
  if (!title) return { error: "Please give the pack a title." };
  if (title.length > MAX_MODULE_TITLE) return { error: `The title must be under ${MAX_MODULE_TITLE} characters.` };

  const { words } = parseWordList(String(formData.get("words") ?? ""));
  if (words.length === 0) return { error: "Paste some Hebrew words (we couldn't find any Hebrew text)." };
  if (words.length > MAX_MODULE_WORDS) return { error: `Too many words (max ${MAX_MODULE_WORDS}). Try a smaller list.` };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("modules")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .gte("created_at", since);
  if (isMissingTable(countError)) return { error: MISSING_TABLES };
  if ((count ?? 0) >= DAILY_MODULE_LIMIT) return { error: "You've reached today's limit for new packs. Please try again tomorrow." };

  try {
    const saved = await defineAndSave(supabase, title, words);

    // Created private first so a failure can be cleaned up (public modules can't be deleted).
    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .insert({ owner_id: user.id, title, visibility: "private" })
      .select("id")
      .single();
    if (moduleError || !module) throw new Error(`module insert: ${moduleError?.message}`);
    try {
      const { error: wordsError } = await supabase
        .from("module_words")
        .insert(saved.map((w, i) => ({ module_id: module.id, vocab_entry_id: w.id, position: i })));
      if (wordsError) throw new Error(`module_words insert: ${wordsError.message}`);
      if (makePublic) {
        const { error: publicError } = await supabase.from("modules").update({ visibility: "public" }).eq("id", module.id);
        if (publicError) throw new Error(`publish: ${publicError.message}`);
      }
    } catch (error) {
      await supabase.from("modules").delete().eq("id", module.id);
      throw error;
    }
    revalidatePath("/", "layout");
    return { moduleId: module.id };
  } catch (error) {
    if (error instanceof AIError) return { error: error.message };
    if (error instanceof Error && error.message === MISSING_TABLES) return { error: MISSING_TABLES };
    console.error("createModule failed", error);
    return { error: "Something went wrong while saving your pack. Please try again." };
  }
}

// Saves the order of the modules a person has added (their own list order).
export async function reorderModules(orderedIds: string[]): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const user = await signedInUser(supabase);
    if (!user) return { ok: false, error: "Please sign in again." };
    const results = await Promise.all(
      orderedIds.map((id, i) => supabase.from("user_modules").update({ position: i }).eq("user_id", user.id).eq("module_id", id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error("reorderModules failed", failed.error);
      return { ok: false, error: /position|schema cache|column/.test(failed.error.message) ? "Ordering needs the latest database update, which hasn't been run yet." : "Couldn't save the new order. Please try again." };
    }
    revalidatePath("/vocabulary");
    return { ok: true };
  } catch (error) {
    console.error("reorderModules crashed", error);
    return { ok: false, error: "Couldn't save the new order. Please try again." };
  }
}

// Put a module's words in the person's Dictionary.
export async function addModule(moduleId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const user = await signedInUser(supabase);
    if (!user) return false;
    const { error } = await supabase
      .from("user_modules")
      .upsert({ user_id: user.id, module_id: moduleId }, { onConflict: "user_id,module_id", ignoreDuplicates: true });
    if (error) {
      console.error("addModule failed", error);
      return false;
    }
    revalidatePath("/", "layout");
    return true;
  } catch (error) {
    console.error("addModule crashed", error);
    return false;
  }
}

export async function makeModulePublic(moduleId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const user = await signedInUser(supabase);
    if (!user) return false;
    const { data, error } = await supabase.from("modules").update({ visibility: "public" }).eq("id", moduleId).eq("owner_id", user.id).select("id");
    if (error || !data || data.length === 0) {
      console.error("makeModulePublic failed", error);
      return false;
    }
    revalidatePath("/", "layout");
    return true;
  } catch (error) {
    console.error("makeModulePublic crashed", error);
    return false;
  }
}

// Remove a module from the person's account: delete their own private module, archive their own
// public one, or just take someone else's off their list.
async function performRemoveModule(moduleId: string) {
  const supabase = await createClient();
  const user = await signedInUser(supabase);
  if (!user) redirect("/login");

  const { data: module } = await supabase.from("modules").select("id, owner_id, visibility").eq("id", moduleId).maybeSingle();
  if (module && module.owner_id === user.id && module.visibility === "private") {
    const { error } = await supabase.from("modules").delete().eq("id", moduleId);
    if (error) throw new Error(`delete module: ${error.message}`);
  } else {
    if (module && module.owner_id === user.id) {
      const { error } = await supabase.from("modules").update({ archived_at: new Date().toISOString() }).eq("id", moduleId);
      if (error) throw new Error(`archive module: ${error.message}`);
    }
    const { error } = await supabase.from("user_modules").delete().eq("user_id", user.id).eq("module_id", moduleId);
    if (error) throw new Error(`remove from list: ${error.message}`);
  }
  revalidatePath("/", "layout");
}

// From a module's own page: remove it, then go back to the list.
export async function removeModule(moduleId: string) {
  await performRemoveModule(moduleId);
  redirect("/vocabulary");
}

// From the module list: remove it and stay on the list. Returns an error message, or null.
export async function removeModuleFromList(moduleId: string): Promise<string | null> {
  try {
    await performRemoveModule(moduleId);
    return null;
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("removeModuleFromList failed", error);
    return "Couldn't remove that pack. Please try again.";
  }
}

async function ownedModule(supabase: SupabaseClient, moduleId: string) {
  const user = await signedInUser(supabase);
  if (!user) return null;
  const { data } = await supabase.from("modules").select("id, title, owner_id").eq("id", moduleId).maybeSingle();
  return data && data.owner_id === user.id ? { user, module: data } : null;
}

export async function renameModule(moduleId: string, title: string): Promise<ActionResult<{ previous: string }>> {
  try {
    const supabase = await createClient();
    const owned = await ownedModule(supabase, moduleId);
    if (!owned) return { ok: false, error: "Only the person who made this pack can change it." };
    const next = title.trim();
    if (!next) return { ok: false, error: "The title can't be empty." };
    if (next.length > MAX_MODULE_TITLE) return { ok: false, error: `The title must be under ${MAX_MODULE_TITLE} characters.` };
    const { error } = await supabase.from("modules").update({ title: next }).eq("id", moduleId);
    if (error) return { ok: false, error: "Couldn't save that. Please try again." };
    return { ok: true, previous: owned.module.title };
  } catch (error) {
    console.error("renameModule crashed", error);
    return { ok: false, error: "Couldn't save that. Please try again." };
  }
}

// Takes a word out of this pack only. The word itself stays in the shared dictionary, and in the
// Dictionary of anyone who has it from a song or another module.
export async function removeModuleWord(moduleId: string, vocabId: string): Promise<ActionResult<{ position: number }>> {
  try {
    const supabase = await createClient();
    if (!(await ownedModule(supabase, moduleId))) return { ok: false, error: "Only the person who made this pack can change it." };
    const { data: row } = await supabase.from("module_words").select("position").eq("module_id", moduleId).eq("vocab_entry_id", vocabId).maybeSingle();
    const { error } = await supabase.from("module_words").delete().eq("module_id", moduleId).eq("vocab_entry_id", vocabId);
    if (error) return { ok: false, error: "Couldn't remove that word. Please try again." };
    return { ok: true, position: row?.position ?? 0 };
  } catch (error) {
    console.error("removeModuleWord crashed", error);
    return { ok: false, error: "Couldn't remove that word. Please try again." };
  }
}

export async function restoreModuleWord(moduleId: string, vocabId: string, position: number): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    if (!(await ownedModule(supabase, moduleId))) return { ok: false, error: "Only the person who made this pack can change it." };
    const { error } = await supabase
      .from("module_words")
      .upsert({ module_id: moduleId, vocab_entry_id: vocabId, position }, { onConflict: "module_id,vocab_entry_id", ignoreDuplicates: true });
    if (error) return { ok: false, error: "Couldn't undo that. Please try again." };
    return { ok: true };
  } catch (error) {
    console.error("restoreModuleWord crashed", error);
    return { ok: false, error: "Couldn't undo that. Please try again." };
  }
}

// Saves a new order for the module's words. The list must be exactly the words already in the module.
export async function reorderModuleWords(moduleId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    if (!(await ownedModule(supabase, moduleId))) return { ok: false, error: "Only the person who made this pack can change it." };
    const { data: current } = await supabase.from("module_words").select("vocab_entry_id").eq("module_id", moduleId);
    const have = new Set((current ?? []).map((r) => r.vocab_entry_id as string));
    if (orderedIds.length !== have.size || new Set(orderedIds).size !== have.size || !orderedIds.every((id) => have.has(id))) {
      return { ok: false, error: "The word list changed. Please reload and try again." };
    }
    const { error } = await supabase
      .from("module_words")
      .upsert(orderedIds.map((id, i) => ({ module_id: moduleId, vocab_entry_id: id, position: i })), { onConflict: "module_id,vocab_entry_id" });
    if (error) return { ok: false, error: "Couldn't save the new order. Please try again." };
    return { ok: true };
  } catch (error) {
    console.error("reorderModuleWords crashed", error);
    return { ok: false, error: "Couldn't save the new order. Please try again." };
  }
}

// Add more words to a module: paste Hebrew words and the AI fills in the rest.
export async function addModuleWords(moduleId: string, text: string): Promise<ActionResult<{ words: ModuleWord[] }>> {
  try {
    const supabase = await createClient();
    const owned = await ownedModule(supabase, moduleId);
    if (!owned) return { ok: false, error: "Only the person who made this pack can change it." };
    const { words } = parseWordList(text);
    if (words.length === 0) return { ok: false, error: "Paste some Hebrew words (we couldn't find any Hebrew text)." };

    const { data: existing } = await supabase.from("module_words").select("vocab_entry_id, position").eq("module_id", moduleId);
    const have = new Set((existing ?? []).map((r) => r.vocab_entry_id as string));
    if (have.size + words.length > MAX_MODULE_WORDS) return { ok: false, error: `A pack can hold up to ${MAX_MODULE_WORDS} words.` };
    let position = Math.max(-1, ...(existing ?? []).map((r) => r.position as number)) + 1;

    const saved = (await defineAndSave(supabase, owned.module.title, words)).filter((w) => !have.has(w.id));
    if (saved.length === 0) return { ok: false, error: "Those words are already in this pack." };
    const { error } = await supabase
      .from("module_words")
      .insert(saved.map((w) => ({ module_id: moduleId, vocab_entry_id: w.id, position: position++ })));
    if (error) return { ok: false, error: "Couldn't add those words. Please try again." };
    return { ok: true, words: saved };
  } catch (error) {
    if (error instanceof AIError) return { ok: false, error: error.message };
    if (error instanceof Error && error.message === MISSING_TABLES) return { ok: false, error: MISSING_TABLES };
    console.error("addModuleWords crashed", error);
    return { ok: false, error: "Couldn't add those words. Please try again." };
  }
}
