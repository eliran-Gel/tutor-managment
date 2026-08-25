"use server";

import { createClient } from "@/lib/supabase/server";
import { getRecentNotifications } from "@/lib/notifications";

// Realtime's websocket can silently die on a backgrounded/idle tab without
// visibly erroring, so the bell can't rely on the INSERT subscription
// alone - this lets the client re-sync on focus/visibility as a fallback.
export async function fetchRecentNotifications(profileId: string) {
  return getRecentNotifications(profileId);
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

export async function markAllNotificationsRead(profileId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_profile_id", profileId)
    .is("read_at", null);
}

export async function deleteNotification(id: string) {
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("id", id);
}

export async function deleteAllNotifications(profileId: string) {
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("recipient_profile_id", profileId);
}
