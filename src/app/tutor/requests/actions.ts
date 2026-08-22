"use server";

import { revalidatePath } from "next/cache";
import { requireTutor } from "@/lib/auth/require-tutor";

function revalidateRequestPaths() {
  revalidatePath("/tutor/requests");
  revalidatePath("/tutor/dashboard");
  revalidatePath("/tutor/calendar");
  revalidatePath("/portal/lessons");
  revalidatePath("/portal/dashboard");
}

export async function approveRequest(lessonId: string) {
  const { supabase } = await requireTutor();

  const { error } = await supabase.rpc("approve_lesson_request", { target_lesson_id: lessonId });
  if (error) return { error: error.message };

  revalidateRequestPaths();
  return { success: true as const };
}

export async function rejectRequest(lessonId: string) {
  const { supabase } = await requireTutor();

  const { error } = await supabase
    .from("lessons")
    .update({ status: "rejected" })
    .eq("id", lessonId)
    .eq("status", "requested");
  if (error) throw new Error(error.message);

  revalidateRequestPaths();
}
