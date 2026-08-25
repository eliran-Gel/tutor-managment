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
  if (error) {
    if (error.message.includes("overlap_conflict")) {
      return { error: "לא ניתן לאשר: יש כבר שיעור מאושר אחר שחופף לזמן הזה." };
    }
    return { error: error.message };
  }

  revalidateRequestPaths();
  return { success: true as const };
}

export async function rejectRequest(lessonId: string) {
  const { supabase } = await requireTutor();

  const { error } = await supabase.rpc("reject_lesson_request", { target_lesson_id: lessonId });
  if (error) throw new Error(error.message);

  revalidateRequestPaths();
}

export async function approveChangeRequest(requestId: string) {
  const { supabase } = await requireTutor();

  const { error } = await supabase.rpc("approve_change_request", { p_request_id: requestId });
  if (error) {
    if (error.message.includes("overlap_conflict")) {
      return { error: "לא ניתן לאשר: יש כבר שיעור מאושר אחר שחופף לזמן החדש המבוקש." };
    }
    return { error: error.message };
  }

  revalidateRequestPaths();
  return { success: true as const };
}

export async function rejectChangeRequest(requestId: string) {
  const { supabase } = await requireTutor();

  const { error } = await supabase.rpc("reject_change_request", { p_request_id: requestId });
  if (error) return { error: error.message };

  revalidateRequestPaths();
  return { success: true as const };
}
