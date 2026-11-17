"use server";

import { createClient } from "@/lib/supabase/server";

async function signedInClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

// Save one flashcard answer. The database applies the learning rules (see the
// learning_model migration). Returns false if it couldn't be saved.
export async function reviewCard(vocabId: string, correct: boolean): Promise<boolean> {
  try {
    const supabase = await signedInClient();
    if (!supabase) return false;
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

// Undo: put a word back exactly as it was before the last answer.
export async function restoreWord(vocabId: string, existed: boolean, correctCount: number, learned: boolean): Promise<boolean> {
  try {
    const supabase = await signedInClient();
    if (!supabase) return false;
    const { error } = await supabase.rpc("restore_word", {
      p_vocab_entry_id: vocabId,
      p_existed: existed,
      p_correct_count: Math.max(0, Math.floor(correctCount)),
      p_learned: learned,
    });
    if (error) {
      console.error("restoreWord failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("restoreWord crashed", error);
    return false;
  }
}
