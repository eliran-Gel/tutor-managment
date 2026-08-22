"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LESSON_DURATIONS } from "@/lib/lessons";
import { checkLessonConflicts, addMinutesToTime } from "@/lib/lesson-conflicts";

const requestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "שעה לא תקינה"),
  duration_minutes: z.coerce
    .number()
    .int()
    .refine((v) => (LESSON_DURATIONS as readonly number[]).includes(v), "משך שיעור לא תקין"),
  subject_id: z.string().uuid("יש לבחור מקצוע"),
  delivery_mode: z.enum(["online", "in_person"]),
  topic: z.string().trim().nullable(),
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

  const { error } = await supabase.from("lessons").insert({
    date: input.date,
    start_time: `${input.start_time}:00`,
    end_time: `${endTime}:00`,
    duration_minutes: input.duration_minutes,
    lesson_type: "individual",
    delivery_mode: input.delivery_mode,
    subject_id: input.subject_id,
    topic: input.topic,
    status: "requested",
    source: "student_request",
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/portal/lessons");
  revalidatePath("/portal/dashboard");
  revalidatePath("/tutor/requests");
  revalidatePath("/tutor/dashboard");
  return { success: true as const };
}
