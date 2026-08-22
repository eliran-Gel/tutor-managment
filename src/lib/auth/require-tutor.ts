import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Defense-in-depth for Server Actions: RLS already blocks non-tutor writes
 * at the database layer, but re-checking here up front gives a clean error
 * instead of a raw Postgres RLS failure, and protects multi-step actions
 * (e.g. link-parent, which touches two tables) that RLS alone can't
 * express atomically.
 */
export async function requireTutor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("יש להתחבר למערכת");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "tutor") throw new Error("פעולה זו זמינה למורה בלבד");

  return { supabase, userId: user.id };
}
