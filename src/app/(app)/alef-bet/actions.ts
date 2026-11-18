"use server";

import { createClient } from "@/lib/supabase/server";
import { cardById } from "@/lib/alef-bet/letters";

// Remember that this person has seen a letter card. Returns false if it couldn't be saved (for example
// when the database update for the trainer hasn't been run yet).
export async function markCardSeen(cardId: string): Promise<boolean> {
  try {
    if (!cardById(cardId)) return false;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from("alef_cards_seen")
      .upsert({ user_id: user.id, card_id: cardId }, { onConflict: "user_id,card_id", ignoreDuplicates: true });
    if (error) {
      console.error("markCardSeen failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("markCardSeen crashed", error);
    return false;
  }
}
