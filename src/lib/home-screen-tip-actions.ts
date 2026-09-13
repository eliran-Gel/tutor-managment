"use server";

import { createClient } from "@/lib/supabase/server";

export async function markHomeScreenTipSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ home_screen_tip_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}
