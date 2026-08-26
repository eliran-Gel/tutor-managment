import type { SupabaseClient } from "@supabase/supabase-js";
import { toAppTime } from "@/lib/dates/timezone";
import { blocksForDate, type AvailabilityBlock } from "@/lib/availability";
import { generateTimeSlots } from "@/lib/time-slots";
import type { Database } from "@/types/database";

export function timeStrToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

type ExistingLesson = { start_time: string; end_time: string };
type WorkingHoursRow = { is_open: boolean; start_time: string | null; end_time: string | null };

async function fetchDayConflictData(
  supabase: SupabaseClient<Database>,
  date: string,
  excludeLessonId?: string,
): Promise<{ dayBlocks: AvailabilityBlock[]; existing: ExistingLesson[]; workingHours: WorkingHoursRow | null }> {
  const dayLocal = new Date(`${date}T00:00:00`);
  const { data: blocks } = await supabase.from("availability_blocks").select("*");
  const dayBlocks = blocksForDate(blocks ?? [], dayLocal);

  let query = supabase
    .from("lessons")
    .select("id, start_time, end_time")
    .eq("date", date)
    .eq("status", "confirmed");
  if (excludeLessonId) query = query.neq("id", excludeLessonId);
  const { data: existing } = await query;

  const { data: workingHours } = await supabase
    .from("tutor_working_hours")
    .select("is_open, start_time, end_time")
    .eq("day_of_week", dayLocal.getDay())
    .maybeSingle();

  return { dayBlocks, existing: existing ?? [], workingHours };
}

function conflictAt(
  reqStartMin: number,
  reqEndMin: number,
  dayBlocks: AvailabilityBlock[],
  existing: ExistingLesson[],
  workingHours: WorkingHoursRow | null,
) {
  // No configured row defaults to "open" (matches pre-working-hours
  // behavior) rather than silently blocking every day if the row is ever
  // missing.
  const outsideWorkingHours = workingHours
    ? !workingHours.is_open ||
      reqStartMin < timeStrToMinutes(workingHours.start_time!.slice(0, 5)) ||
      reqEndMin > timeStrToMinutes(workingHours.end_time!.slice(0, 5))
    : false;

  const blockedByException = dayBlocks.some((block) => {
    const blockStart = toAppTime(block.start_at);
    const blockEnd = toAppTime(block.end_at);
    const blockStartMin = blockStart.getHours() * 60 + blockStart.getMinutes();
    const blockEndMin = blockEnd.getHours() * 60 + blockEnd.getMinutes();
    return reqStartMin < blockEndMin && reqEndMin > blockStartMin;
  });

  const doubleBooked = existing.some((l) => {
    const existingStart = timeStrToMinutes(l.start_time.slice(0, 5));
    const existingEnd = timeStrToMinutes(l.end_time.slice(0, 5));
    return reqStartMin < existingEnd && reqEndMin > existingStart;
  });

  return { blocked: outsideWorkingHours || blockedByException, doubleBooked };
}

/**
 * Checks a proposed date/time range against availability_blocks and
 * existing confirmed lessons. Used both by the student request flow
 * (where any conflict is a hard rejection) and manual lesson creation
 * (where the tutor can override via `forced`).
 */
export async function checkLessonConflicts(
  supabase: SupabaseClient<Database>,
  date: string,
  startTime: string,
  endTime: string,
  excludeLessonId?: string,
) {
  const { dayBlocks, existing, workingHours } = await fetchDayConflictData(supabase, date, excludeLessonId);
  const { blocked, doubleBooked } = conflictAt(
    timeStrToMinutes(startTime),
    timeStrToMinutes(endTime),
    dayBlocks,
    existing,
    workingHours,
  );
  return { blocked, doubleBooked, hasConflict: blocked || doubleBooked };
}

/**
 * Every on-the-hour start time a lesson of `durationMinutes` could start at
 * on `date` without overlapping a blocked period, working hours, or an
 * existing confirmed lesson - so the picker only ever offers slots that
 * would actually succeed, instead of surfacing the conflict only after
 * submission. Students may only request/reschedule on the hour (the
 * tutor's own manual creation keeps the finer 15-minute grid, unaffected -
 * this is only used from the student-facing request/reschedule flows).
 * `excludeLessonId` lets a reschedule ignore the lesson's own current slot
 * when checking itself for "conflicts".
 */
export async function getAvailableStartTimes(
  supabase: SupabaseClient<Database>,
  date: string,
  durationMinutes: number,
  excludeLessonId?: string,
): Promise<string[]> {
  const { dayBlocks, existing, workingHours } = await fetchDayConflictData(supabase, date, excludeLessonId);

  return generateTimeSlots(0, 24, 60).filter((slot) => {
    const { endTime, crossesMidnight } = addMinutesToTime(slot, durationMinutes);
    if (crossesMidnight) return false;
    const { blocked, doubleBooked } = conflictAt(
      timeStrToMinutes(slot),
      timeStrToMinutes(endTime),
      dayBlocks,
      existing,
      workingHours,
    );
    return !blocked && !doubleBooked;
  });
}

export function addMinutesToTime(startTime: string, durationMinutes: number) {
  const startLocal = new Date(`2000-01-01T${startTime}:00`);
  const endLocal = new Date(startLocal.getTime() + durationMinutes * 60000);
  const crossesMidnight = endLocal.getDate() !== startLocal.getDate();
  const endTime = `${String(endLocal.getHours()).padStart(2, "0")}:${String(endLocal.getMinutes()).padStart(2, "0")}`;
  return { endTime, crossesMidnight };
}
