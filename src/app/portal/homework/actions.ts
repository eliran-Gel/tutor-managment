"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markHomeworkDone(id: string, isDone: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "יש להתחבר למערכת" };

  const { error } = await supabase.from("homework").update({ is_done: isDone }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/portal/homework");
  revalidatePath("/tutor/homework");
  return { success: true as const };
}
