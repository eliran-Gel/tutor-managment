"use server";

import { revalidatePath } from "next/cache";
import { requireTutor } from "@/lib/auth/require-tutor";

function revalidateRequestPaths() {
  revalidatePath("/tutor/requests");
  revalidatePath("/tutor/dashboard");
  revalidatePath("/tutor/calendar");
  revalidatePath("/tutor/calendar/day/[date]", "page");
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

export async function rejectRequest(lessonId: string, reason?: string) {
  const { supabase } = await requireTutor();

  const { error } = await supabase.rpc("reject_lesson_request", {
    target_lesson_id: lessonId,
    p_reason: reason ?? "",
  });
  if (error) return { error: error.message };

  revalidateRequestPaths();
  return { success: true as const };
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

export async function resolveLead(id: string, status: "contacted" | "dismissed") {
  const { supabase } = await requireTutor();

  const { error } = await supabase.from("marketing_leads").update({ status }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/tutor/requests");
  return { success: true as const };
}

export async function resolveWaitlistEntry(id: string, status: "fulfilled" | "cancelled") {
  const { supabase } = await requireTutor();

  const { error } = await supabase
    .from("waitlist_entries")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateRequestPaths();
  return { success: true as const };
}
