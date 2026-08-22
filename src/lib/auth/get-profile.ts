import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  return profile;
}

export const ROLE_LABELS: Record<string, string> = {
  tutor: "מורה פרטי",
  parent: "הורה",
  student: "תלמיד",
};
