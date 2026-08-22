"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTutor } from "@/lib/auth/require-tutor";
import { checkLessonConflicts, addMinutesToTime } from "@/lib/lesson-conflicts";
import { LESSON_DURATIONS } from "@/lib/lessons";

const participantSchema = z.object({
  student_id: z.string().uuid(),
  price: z.coerce.number().nonnegative(),
});

const manualLessonSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "שעה לא תקינה"),
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
  participants: z
    .array(participantSchema)
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

export async function createManualLesson(input: ManualLessonInput) {
  const { supabase } = await requireTutor();

  const parsed = manualLessonSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  const data = parsed.data;

  if (data.lesson_type === "individual" && data.participants.length !== 1) {
    return { error: "שיעור יחיד יכול לכלול תלמיד/ה אחד/ת בלבד" };
  }
  const studentIds = new Set(data.participants.map((p) => p.student_id));
  if (studentIds.size !== data.participants.length) {
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
    p_participants: data.participants.map((p) => ({ student_id: p.student_id, price: p.price })),
  });
  if (error) return { error: error.message };

  revalidateLessonPaths();
  return { success: true as const };
}
