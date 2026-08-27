"use server";

import { createClient } from "@/lib/supabase/server";
import { getRecentNotifications } from "@/lib/notifications";

// Realtime's websocket can silently die on a backgrounded/idle tab without
// visibly erroring, so the bell can't rely on the INSERT subscription
// alone - this lets the client re-sync on focus/visibility as a fallback.
// Safe to take profileId from the caller: getRecentNotifications' own
// query is still scoped by notifications_select_own RLS (recipient_profile_id
// = auth.uid()), so a forged id just yields zero rows, never someone else's.
export async function fetchRecentNotifications(profileId: string) {
  return getRecentNotifications(profileId);
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_profile_id", user.id);
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_profile_id", user.id)
    .is("read_at", null);
}

export async function deleteNotification(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").delete().eq("id", id).eq("recipient_profile_id", user.id);
}

export async function deleteAllNotifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").delete().eq("recipient_profile_id", user.id);
}
