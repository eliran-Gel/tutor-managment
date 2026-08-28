"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTutor } from "@/lib/auth/require-tutor";

function revalidatePaymentPaths(lessonId: string) {
  revalidatePath("/tutor/payments");
  revalidatePath("/tutor/dashboard");
  revalidatePath(`/tutor/lessons/${lessonId}`);
  revalidatePath("/tutor/students/[id]", "page");
  revalidatePath("/portal/payments");
}

const markPaidSchema = z.object({
  payment_method: z.enum(["cash", "bit", "paybox", "other"]),
  payment_note: z.string().trim().nullable(),
});

export async function markPaymentReceived(participantId: string, lessonId: string, formData: FormData) {
  const { supabase } = await requireTutor();
  const parsed = markPaidSchema.safeParse({
    payment_method: formData.get("payment_method"),
    payment_note: (formData.get("payment_note") as string) || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };

  const { error } = await supabase
    .from("lesson_participants")
    .update({
      payment_status: "paid",
      payment_method: parsed.data.payment_method,
      payment_note: parsed.data.payment_note,
      payment_received_at: new Date().toISOString(),
    })
    .eq("id", participantId);
  if (error) return { error: error.message };

  revalidatePaymentPaths(lessonId);
  return { success: true as const };
}

export async function markPaymentUnpaid(participantId: string, lessonId: string) {
  const { supabase } = await requireTutor();
  const { error } = await supabase
    .from("lesson_participants")
    .update({ payment_status: "unpaid", payment_method: null, payment_note: null, payment_received_at: null })
    .eq("id", participantId);
  if (error) return { error: error.message };

  revalidatePaymentPaths(lessonId);
  return { success: true as const };
}
