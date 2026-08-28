"use server";

import { createClient } from "@/lib/supabase/server";

export async function subscribeToPush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "יש להתחבר למערכת" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      profile_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { error: error.message };

  return { success: true as const };
}

export async function unsubscribeFromPush(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "יש להתחבר למערכת" };

  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("profile_id", user.id);
  if (error) return { error: error.message };

  return { success: true as const };
}
