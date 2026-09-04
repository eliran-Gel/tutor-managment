"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addWeeks, format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireTutor } from "@/lib/auth/require-tutor";
import { checkLessonConflicts, addMinutesToTime } from "@/lib/lesson-conflicts";
import { LESSON_DURATIONS } from "@/lib/lessons";
import { isValidTimeSlot } from "@/lib/time-slots";
import type { Database } from "@/types/database";

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
  revalidatePath("/tutor/calendar/day/[date]", "page");
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

function addWeeksIso(dateStr: string, weeks: number) {
  return format(addWeeks(new Date(`${dateStr}T00:00:00`), weeks), "yyyy-MM-dd");
}

const lessonSeriesSchema = z.object({
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
  student_ids: z
    .array(z.string().uuid())
    .min(1, "יש לבחור לפחות תלמיד/ה אחד/ת")
    .max(3, "עד 3 תלמידים בשיעור"),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export type LessonSeriesInput = z.infer<typeof lessonSeriesSchema>;

// A fixed horizon generated up front, not an ever-extending cron job - this
// project's one earlier attempt at background/scheduled DB jobs (the push
// notification pg_cron + pg_net chain, see the string of debug migrations
// around 2026-08-28) took many iterations to get working reliably. Ten
// weeks is roughly a school term; the /tutor/series page lets the tutor
// top a series up manually with one click once it's running low, instead
// of betting this feature's correctness on a cron job firing silently in
// the background where a failure would go unnoticed.
const SERIES_HORIZON_WEEKS = 10;

/**
 * Generates lesson occurrences for a series starting at `fromDate`
 * (inclusive), one per week, up to SERIES_HORIZON_WEEKS or the series'
 * end_date - whichever comes first. Reuses the exact same conflict check
 * and create_manual_lesson RPC a one-off manual lesson goes through
 * (tagged with series_id instead of left null); a conflicting date is
 * skipped and reported rather than silently forced, since nobody is
 * looking at each occurrence individually the way a tutor creating one
 * lesson by hand would be.
 */
async function generateSeriesOccurrences(
  supabase: SupabaseClient<Database>,
  series: {
    id: string;
    start_time: string;
    duration_minutes: number;
    lesson_type: "individual" | "group";
    delivery_mode: "online" | "in_person";
    subject_id: string;
    topic: string | null;
    online_url: string | null;
    student_ids: string[];
    end_date: string | null;
  },
  fromDate: string,
) {
  const startTime = series.start_time.slice(0, 5);
  const { endTime } = addMinutesToTime(startTime, series.duration_minutes);

  const created: string[] = [];
  const skipped: string[] = [];

  for (let i = 0; i < SERIES_HORIZON_WEEKS; i++) {
    const occurrenceDate = i === 0 ? fromDate : addWeeksIso(fromDate, i);
    if (series.end_date && occurrenceDate > series.end_date) break;

    const { blocked, doubleBooked } = await checkLessonConflicts(supabase, occurrenceDate, startTime, endTime);
    if (blocked || doubleBooked) {
      skipped.push(occurrenceDate);
      continue;
    }

    const { error } = await supabase.rpc("create_manual_lesson", {
      p_date: occurrenceDate,
      p_start_time: `${startTime}:00`,
      p_end_time: `${endTime}:00`,
      p_duration_minutes: series.duration_minutes,
      p_lesson_type: series.lesson_type,
      p_delivery_mode: series.delivery_mode,
      p_subject_id: series.subject_id,
      p_topic: series.topic ?? "",
      p_online_url: series.online_url ?? "",
      p_forced: true, // conflicts were already checked just above
      p_student_ids: series.student_ids,
      p_series_id: series.id,
    });
    if (error) {
      skipped.push(occurrenceDate);
      continue;
    }
    created.push(occurrenceDate);
  }

  return { created, skipped };
}

export async function createLessonSeries(input: LessonSeriesInput) {
  const { supabase, userId } = await requireTutor();
  const parsed = lessonSeriesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  const data = parsed.data;

  if (data.lesson_type === "individual" && data.student_ids.length !== 1) {
    return { error: "שיעור יחיד יכול לכלול תלמיד/ה אחד/ת בלבד" };
  }
  if (new Set(data.student_ids).size !== data.student_ids.length) {
    return { error: "אותו תלמיד/ה נבחר/ה פעמיים" };
  }
  const { crossesMidnight } = addMinutesToTime(data.start_time, data.duration_minutes);
  if (crossesMidnight) return { error: "שיעור לא יכול לחצות חצות" };
  if (data.end_date && data.end_date < data.date) return { error: "תאריך הסיום לא יכול להיות לפני תאריך ההתחלה" };

  const weekday = new Date(`${data.date}T00:00:00`).getDay();

  const { data: seriesRow, error: seriesErr } = await supabase
    .from("lesson_series")
    .insert({
      created_by: userId,
      weekday,
      start_time: `${data.start_time}:00`,
      duration_minutes: data.duration_minutes,
      lesson_type: data.lesson_type,
      delivery_mode: data.delivery_mode,
      subject_id: data.subject_id,
      online_url: data.online_url,
      topic: data.topic,
      student_ids: data.student_ids,
      end_date: data.end_date,
    })
    .select("id")
    .single();
  if (seriesErr) return { error: seriesErr.message };

  // Built from `data` (zod-validated, precisely typed) rather than
  // re-selecting the row just inserted - avoids fighting the DB's
  // genuinely-nullable column types (subject_id in particular) for values
  // this action itself just confirmed are non-null.
  const { created, skipped } = await generateSeriesOccurrences(
    supabase,
    {
      id: seriesRow.id,
      start_time: `${data.start_time}:00`,
      duration_minutes: data.duration_minutes,
      lesson_type: data.lesson_type,
      delivery_mode: data.delivery_mode,
      subject_id: data.subject_id,
      topic: data.topic,
      online_url: data.online_url,
      student_ids: data.student_ids,
      end_date: data.end_date,
    },
    data.date,
  );

  revalidateLessonPaths();
  revalidatePath("/tutor/series");
  return { success: true as const, created: created.length, skipped };
}

export async function extendLessonSeries(seriesId: string) {
  const { supabase } = await requireTutor();

  const { data: series, error: fetchErr } = await supabase
    .from("lesson_series")
    .select("*")
    .eq("id", seriesId)
    .single();
  if (fetchErr) return { error: fetchErr.message };
  if (!series.active) return { error: "הסדרה הזו כבר בוטלה" };
  // Genuinely can't happen through createLessonSeries (subject_id is
  // required there) - guards the type rather than asserting past it, in
  // case a series is ever created some other way.
  if (!series.subject_id) return { error: "לסדרה הזו אין מקצוע מוגדר" };

  const { data: lastLesson } = await supabase
    .from("lessons")
    .select("date")
    .eq("series_id", seriesId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const fromDate = lastLesson ? addWeeksIso(lastLesson.date, 1) : today;

  // Rebuilt as a literal (not just narrowed) - narrowing series.subject_id
  // above only narrows that direct property read, not the containing
  // object's type when passed elsewhere.
  const { created, skipped } = await generateSeriesOccurrences(
    supabase,
    { ...series, subject_id: series.subject_id },
    fromDate,
  );

  revalidateLessonPaths();
  revalidatePath("/tutor/series");
  return { success: true as const, created: created.length, skipped };
}

export async function cancelLessonSeries(seriesId: string) {
  const { supabase } = await requireTutor();
  const today = new Date().toISOString().slice(0, 10);

  const { data: futureLessons, error: fetchErr } = await supabase
    .from("lessons")
    .select("id")
    .eq("series_id", seriesId)
    .eq("status", "confirmed")
    .gte("date", today);
  if (fetchErr) return { error: fetchErr.message };

  // Reuses cancelLesson (and the cancel_lesson RPC's cancellation-fee
  // policy behind it) one occurrence at a time, instead of a bulk status
  // update - a series is just a bunch of individually-cancelled lessons
  // that happen to share a series_id, not a special case the fee policy
  // needs to know about.
  for (const lesson of futureLessons ?? []) {
    await cancelLesson(lesson.id);
  }

  const { error: deactivateErr } = await supabase.from("lesson_series").update({ active: false }).eq("id", seriesId);
  if (deactivateErr) return { error: deactivateErr.message };

  revalidateLessonPaths();
  revalidatePath("/tutor/series");
  return { success: true as const, cancelledCount: (futureLessons ?? []).length };
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
  if (name.length > 40) return { error: "שם יכול להכיל עד 40 תווים" };

  const { data, error } = await supabase
    .from("students")
    .insert({ display_name: name, is_guest: true })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/tutor/students");
  return { id: data.id as string };
}
