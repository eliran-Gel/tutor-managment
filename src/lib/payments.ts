import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type OverduePayment = {
  participantId: string;
  price: number;
  lessonId: string;
  date: string;
  startTime: string;
  subjectName: string;
  studentName: string;
};

/**
 * Matches docs/IMPLEMENTATION_PLAN.md §R exactly: unpaid + confirmed
 * lessons whose date is at least `payment_reminder_days` in the past. No
 * running-balance aggregate is ever computed from this - only per-lesson
 * rows are surfaced, per the "no debt dashboard" constraint.
 */
export async function fetchOverduePayments(
  supabase: SupabaseClient<Database>,
): Promise<OverduePayment[]> {
  const { data: settings } = await supabase
    .from("tutor_settings")
    .select("payment_reminder_days")
    .eq("id", true)
    .single();
  const reminderDays = settings?.payment_reminder_days ?? 3;

  const threshold = new Date();
  threshold.setDate(threshold.getDate() - reminderDays);
  const thresholdIso = threshold.toISOString().slice(0, 10);

  const { data: lessons } = await supabase
    .from("lessons")
    .select(
      "id, date, start_time, subjects(name), lesson_participants(id, price_charged, payment_status, students(display_name))",
    )
    .eq("status", "confirmed")
    .lte("date", thresholdIso)
    .order("date", { ascending: true });

  const overdue: OverduePayment[] = [];
  for (const lesson of lessons ?? []) {
    for (const participant of lesson.lesson_participants) {
      if (participant.payment_status !== "unpaid") continue;
      overdue.push({
        participantId: participant.id,
        price: participant.price_charged,
        lessonId: lesson.id,
        date: lesson.date,
        startTime: lesson.start_time,
        subjectName: lesson.subjects?.name ?? "שיעור",
        studentName: participant.students?.display_name ?? "תלמיד/ה",
      });
    }
  }
  return overdue;
}
