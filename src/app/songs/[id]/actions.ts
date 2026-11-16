"use server";

import { createClient } from "@/lib/supabase/server";

// Remember the user's transliteration on/off preference.
export async function setTransliteration(show: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ show_transliteration: show }).eq("id", user.id);
}
