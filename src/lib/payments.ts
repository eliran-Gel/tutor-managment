import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { formatAppTime } from "@/lib/dates/timezone";

export type OverduePayment = {
  participantId: string;
  price: number;
  lessonId: string;
  date: string;
  startTime: string;
  subjectName: string;
  studentName: string;
  cancellationNote: string | null;
};

/**
 * Every unpaid lesson that has already taken place (a lesson ending
 * earlier today counts too) shows up immediately - no waiting period. No
 * running-balance aggregate is ever computed from this - only per-lesson
 * rows are surfaced, per the "no debt dashboard" constraint.
 */
export async function fetchOverduePayments(
  supabase: SupabaseClient<Database>,
): Promise<OverduePayment[]> {
  const todayIso = formatAppTime(new Date(), "yyyy-MM-dd");
  const nowTime = formatAppTime(new Date(), "HH:mm");

  const { data: lessons } = await supabase
    .from("lessons")
    .select(
      "id, date, start_time, end_time, subjects(name), lesson_participants(id, price_charged, payment_status, cancellation_note, students(display_name))",
    )
    // Includes cancelled lessons too - a late-cancellation fee is still
    // owed even though the lesson itself never happened.
    .in("status", ["confirmed", "completed", "cancelled"])
    .lte("date", todayIso)
    .order("date", { ascending: true });

  const overdue: OverduePayment[] = [];
  for (const lesson of lessons ?? []) {
    const hasHappened = lesson.date < todayIso || lesson.end_time.slice(0, 5) <= nowTime;
    if (!hasHappened) continue;
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
        cancellationNote: participant.cancellation_note,
      });
    }
  }
  return overdue;
}
