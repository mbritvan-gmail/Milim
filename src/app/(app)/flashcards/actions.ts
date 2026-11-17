"use server";

import { createClient } from "@/lib/supabase/server";

// Save one flashcard answer. The database moves the word between Leitner boxes and marks it
// "learned" after 3 correct answers. Returns false if it couldn't be saved.
export async function reviewCard(vocabId: string, correct: boolean): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.rpc("record_answer", { p_vocab_entry_id: vocabId, p_correct: correct });
    if (error) {
      console.error("reviewCard failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("reviewCard crashed", error);
    return false;
  }
}
