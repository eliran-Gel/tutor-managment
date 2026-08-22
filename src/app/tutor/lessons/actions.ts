"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTutor } from "@/lib/auth/require-tutor";
import { checkLessonConflicts, addMinutesToTime } from "@/lib/lesson-conflicts";
import { LESSON_DURATIONS } from "@/lib/lessons";
import { isValidTimeSlot } from "@/lib/time-slots";

const manualLessonSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "שעה לא תקינה")
    .refine(isValidTimeSlot, "השעה חייבת להיות בכפולות של רבע שעה"),
  duration_minutes: z.coerce
    .number()
    .int()
    .refine((v) => (LESSON_DURATIONS as readonly number[]).includes(v), "משך שיעור לא תקין"),
  lesson_type: z.enum(["individual", "group"]),
  delivery_mode: z.enum(["online", "in_person"]),
  subject_id: z.string().uuid("יש לבחור מקצוע"),
  topic: z.string().trim().nullable(),
  online_url: z.string().trim().nullable(),
  forced: z.boolean().optional(),
  student_ids: z
    .array(z.string().uuid())
    .min(1, "יש לבחור לפחות תלמיד/ה אחד/ת")
    .max(3, "עד 3 תלמידים בשיעור"),
});

export type ManualLessonInput = z.infer<typeof manualLessonSchema>;

function revalidateLessonPaths() {
  revalidatePath("/tutor/calendar");
  revalidatePath("/tutor/dashboard");
  revalidatePath("/tutor/students");
  revalidatePath("/portal/lessons");
  revalidatePath("/portal/dashboard");
}

export async function cancelLesson(lessonId: string) {
  const { supabase } = await requireTutor();

  const { error } = await supabase.rpc("cancel_lesson", { target_lesson_id: lessonId });
  if (error) return { error: error.message };

  revalidateLessonPaths();
  return { success: true as const };
}

export async function createManualLesson(input: ManualLessonInput) {
  const { supabase } = await requireTutor();

  const parsed = manualLessonSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  const data = parsed.data;

  if (data.lesson_type === "individual" && data.student_ids.length !== 1) {
    return { error: "שיעור יחיד יכול לכלול תלמיד/ה אחד/ת בלבד" };
  }
  if (new Set(data.student_ids).size !== data.student_ids.length) {
    return { error: "אותו תלמיד/ה נבחר/ה פעמיים" };
  }

  const { endTime, crossesMidnight } = addMinutesToTime(data.start_time, data.duration_minutes);
  if (crossesMidnight) return { error: "שיעור לא יכול לחצות חצות" };

  if (!data.forced) {
    const { blocked, doubleBooked } = await checkLessonConflicts(
      supabase,
      data.date,
      data.start_time,
      endTime,
    );
    if (blocked || doubleBooked) {
      return {
        conflict: true as const,
        message: blocked
          ? "הזמן הזה חופף לחסימת זמן קיימת. ליצור את השיעור בכל זאת?"
          : "הזמן הזה חופף לשיעור מאושר אחר. ליצור את השיעור בכל זאת?",
      };
    }
  }

  const { error } = await supabase.rpc("create_manual_lesson", {
    p_date: data.date,
    p_start_time: `${data.start_time}:00`,
    p_end_time: `${endTime}:00`,
    p_duration_minutes: data.duration_minutes,
    p_lesson_type: data.lesson_type,
    p_delivery_mode: data.delivery_mode,
    p_subject_id: data.subject_id,
    p_topic: data.topic ?? "",
    p_online_url: data.online_url ?? "",
    p_forced: Boolean(data.forced),
    p_student_ids: data.student_ids,
  });
  if (error) return { error: error.message };

  revalidateLessonPaths();
  return { success: true as const };
}

/**
 * Creates a new guest student on the fly while booking a lesson (e.g. a
 * WhatsApp-arranged lesson for someone not yet in the roster), returning
 * its id so the caller can include it in the same createManualLesson call.
 * No price is set here - pricing is a fixed table by lesson type/duration,
 * not per-student.
 */
export async function createGuestStudentQuick(displayName: string) {
  const { supabase } = await requireTutor();

  const name = displayName.trim();
  if (!name) return { error: "יש להזין שם" };

  const { data, error } = await supabase
    .from("students")
    .insert({ display_name: name, is_guest: true })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/tutor/students");
  return { id: data.id as string };
}
