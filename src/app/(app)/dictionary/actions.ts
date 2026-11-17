"use server";

import { createClient } from "@/lib/supabase/server";

async function call(name: "mark_word_known" | "reset_word", vocabId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.rpc(name, { p_vocab_entry_id: vocabId });
    if (error) {
      console.error(`${name} failed`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`${name} crashed`, error);
    return false;
  }
}

// "I know this": mark it Learned without going through the steps.
export async function markWordKnown(vocabId: string): Promise<boolean> {
  return call("mark_word_known", vocabId);
}

// Reset a word back to Learning with its progress cleared.
export async function resetWord(vocabId: string): Promise<boolean> {
  return call("reset_word", vocabId);
}
