import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type NotificationRow = Tables<"notifications">;

export async function getRecentNotifications(profileId: string): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}
