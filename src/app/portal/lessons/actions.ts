"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LESSON_DURATIONS } from "@/lib/lessons";
import { checkLessonConflicts, addMinutesToTime, getAvailableStartTimes } from "@/lib/lesson-conflicts";
import { isValidHourSlot } from "@/lib/time-slots";

export async function getAvailableStartTimesAction(
  date: string,
  durationMinutes: number,
  excludeLessonId?: string,
) {
  const supabase = await createClient();
  return getAvailableStartTimes(supabase, date, durationMinutes, excludeLessonId);
}

const changeRequestSchema = z
  .object({
    lesson_id: z.string().uuid(),
    request_type: z.enum(["reschedule", "cancel"]),
    requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    requested_start_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .refine(isValidHourSlot, "ניתן לבקש שיעור רק בשעה עגולה")
      .nullable(),
    requested_subject_id: z.string().uuid().nullable(),
    reason: z.string().trim().nullable(),
  })
  .refine((v) => v.request_type === "cancel" || (v.requested_date && v.requested_start_time), {
    message: "יש לבחור תאריך ושעה חדשים לדחיית השיעור",
    path: ["requested_date"],
  });

export async function requestLessonChange(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "יש להתחבר למערכת" };

  const parsed = changeRequestSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    request_type: formData.get("request_type"),
    requested_date: (formData.get("requested_date") as string) || null,
    requested_start_time: (formData.get("requested_start_time") as string) || null,
    requested_subject_id: (formData.get("requested_subject_id") as string) || null,
    reason: (formData.get("reason") as string) || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  }
  const input = parsed.data;

  let requestedEndTime: string | null = null;
  if (input.request_type === "reschedule") {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("duration_minutes")
      .eq("id", input.lesson_id)
      .single();
    if (!lesson) return { error: "השיעור לא נמצא" };

    const requestedDate = new Date(`${input.requested_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate < today) return { error: "לא ניתן לבקש תאריך בעבר" };

    const { endTime, crossesMidnight } = addMinutesToTime(input.requested_start_time!, lesson.duration_minutes);
    if (crossesMidnight) return { error: "שיעור לא יכול לחצות חצות" };
    requestedEndTime = endTime;
  }

  const { error } = await supabase.rpc("request_lesson_change", {
    p_lesson_id: input.lesson_id,
    p_request_type: input.request_type,
    p_requested_date: input.requested_date ?? "",
    p_requested_start_time: input.requested_start_time ? `${input.requested_start_time}:00` : "",
    p_requested_end_time: requestedEndTime ? `${requestedEndTime}:00` : "",
    p_requested_subject_id: input.requested_subject_id ?? "",
    p_reason: input.reason ?? "",
  });
  if (error) return { error: error.message };

  revalidatePath("/portal/lessons");
  revalidatePath("/portal/dashboard");
  revalidatePath("/tutor/requests");
  revalidatePath("/tutor/dashboard");
  revalidatePath("/tutor/calendar");
  return { success: true as const };
}

const requestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "שעה לא תקינה")
    .refine(isValidHourSlot, "ניתן לבקש שיעור רק בשעה עגולה"),
  duration_minutes: z.coerce
    .number()
    .int()
    .refine((v) => (LESSON_DURATIONS as readonly number[]).includes(v), "משך שיעור לא תקין"),
  subject_id: z.string().uuid("יש לבחור מקצוע"),
  delivery_mode: z.enum(["online", "in_person"]),
  topic: z.string().trim().nullable(),
  student_id: z.string().uuid("לא ידוע עבור איזה תלמיד/ה לבקש שיעור"),
});

export async function requestLesson(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "יש להתחבר למערכת" };

  const parsed = requestSchema.safeParse({
    date: formData.get("date"),
    start_time: formData.get("start_time"),
    duration_minutes: formData.get("duration_minutes"),
    subject_id: formData.get("subject_id"),
    delivery_mode: formData.get("delivery_mode"),
    topic: (formData.get("topic") as string) || null,
    student_id: formData.get("student_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  }
  const input = parsed.data;

  // Booking horizon: up to 1 month ahead, not in the past.
  const requestedDate = new Date(`${input.date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 1);
  if (requestedDate < today) return { error: "לא ניתן לבקש שיעור בעבר" };
  if (requestedDate > maxDate) return { error: "ניתן לבקש שיעור עד חודש קדימה בלבד" };

  const { endTime, crossesMidnight } = addMinutesToTime(input.start_time, input.duration_minutes);
  if (crossesMidnight) return { error: "שיעור לא יכול לחצות חצות" };

  const { blocked, doubleBooked } = await checkLessonConflicts(
    supabase,
    input.date,
    input.start_time,
    endTime,
  );
  if (blocked) return { error: "הזמן המבוקש חסום ואינו זמין" };
  if (doubleBooked) return { error: "יש כבר שיעור מאושר בזמן הזה" };

  const { error } = await supabase.rpc("request_lesson", {
    p_date: input.date,
    p_start_time: `${input.start_time}:00`,
    p_end_time: `${endTime}:00`,
    p_duration_minutes: input.duration_minutes,
    p_delivery_mode: input.delivery_mode,
    p_subject_id: input.subject_id,
    p_topic: input.topic ?? "",
    p_student_id: input.student_id,
  });
  if (error) return { error: error.message };

  revalidatePath("/portal/lessons");
  revalidatePath("/portal/dashboard");
  revalidatePath("/tutor/requests");
  revalidatePath("/tutor/dashboard");
  return { success: true as const };
}

const editRequestSchema = requestSchema.extend({ lesson_id: z.string().uuid() });

export async function editLessonRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "יש להתחבר למערכת" };

  const parsed = editRequestSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    date: formData.get("date"),
    start_time: formData.get("start_time"),
    duration_minutes: formData.get("duration_minutes"),
    subject_id: formData.get("subject_id"),
    delivery_mode: formData.get("delivery_mode"),
    topic: (formData.get("topic") as string) || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  }
  const input = parsed.data;

  const requestedDate = new Date(`${input.date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 1);
  if (requestedDate < today) return { error: "לא ניתן לבקש שיעור בעבר" };
  if (requestedDate > maxDate) return { error: "ניתן לבקש שיעור עד חודש קדימה בלבד" };

  const { endTime, crossesMidnight } = addMinutesToTime(input.start_time, input.duration_minutes);
  if (crossesMidnight) return { error: "שיעור לא יכול לחצות חצות" };

  const { blocked, doubleBooked } = await checkLessonConflicts(
    supabase,
    input.date,
    input.start_time,
    endTime,
    input.lesson_id,
  );
  if (blocked) return { error: "הזמן המבוקש חסום ואינו זמין" };
  if (doubleBooked) return { error: "יש כבר שיעור מאושר בזמן הזה" };

  const { error } = await supabase.rpc("edit_lesson_request", {
    target_lesson_id: input.lesson_id,
    p_date: input.date,
    p_start_time: `${input.start_time}:00`,
    p_end_time: `${endTime}:00`,
    p_duration_minutes: input.duration_minutes,
    p_delivery_mode: input.delivery_mode,
    p_subject_id: input.subject_id,
    p_topic: input.topic ?? "",
  });
  if (error) return { error: error.message };

  revalidatePath("/portal/lessons");
  revalidatePath("/portal/dashboard");
  revalidatePath("/tutor/requests");
  revalidatePath("/tutor/dashboard");
  return { success: true as const };
}

export async function cancelLessonRequest(lessonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "יש להתחבר למערכת" };

  const { error } = await supabase.rpc("cancel_lesson_request", { target_lesson_id: lessonId });
  if (error) return { error: error.message };

  revalidatePath("/portal/lessons");
  revalidatePath("/portal/dashboard");
  revalidatePath("/tutor/requests");
  revalidatePath("/tutor/dashboard");
  return { success: true as const };
}

// A rejected/cancelled request is dead weight in "השיעורים שלי" (it never
// resulted in an actual lesson) - lets the student who made it clear it
// away permanently. Same delete_lesson_from_history RPC the tutor's
// per-student history page uses, which independently re-checks that the
// caller is either the tutor or this lesson's own created_by.
export async function deleteLessonFromHistory(lessonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "יש להתחבר למערכת" };

  const { error } = await supabase.rpc("delete_lesson_from_history", { target_lesson_id: lessonId });
  if (error) return { error: error.message };

  revalidatePath("/portal/lessons");
  revalidatePath("/portal/dashboard");
  return { success: true as const };
}
