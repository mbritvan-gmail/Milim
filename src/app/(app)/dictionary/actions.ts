"use server";

import { createClient } from "@/lib/supabase/server";

// "I already know this word": mark it learned without going through the steps.
export async function markWordKnown(vocabId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.rpc("mark_word_known", { p_vocab_entry_id: vocabId });
    if (error) {
      console.error("markWordKnown failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("markWordKnown crashed", error);
    return false;
  }
}
