import type { SupabaseClient } from "@supabase/supabase-js";
import { toAppTime } from "@/lib/dates/timezone";
import { blocksForDate } from "@/lib/availability";
import type { Database } from "@/types/database";

export function timeStrToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
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
  const startLocal = new Date(`${date}T${startTime}:00`);
  const reqStartMin = timeStrToMinutes(startTime);
  const reqEndMin = timeStrToMinutes(endTime);

  const { data: blocks } = await supabase.from("availability_blocks").select("*");
  const dayBlocks = blocksForDate(blocks ?? [], startLocal);
  const blocked = dayBlocks.some((block) => {
    const blockStart = toAppTime(block.start_at);
    const blockEnd = toAppTime(block.end_at);
    const blockStartMin = blockStart.getHours() * 60 + blockStart.getMinutes();
    const blockEndMin = blockEnd.getHours() * 60 + blockEnd.getMinutes();
    return reqStartMin < blockEndMin && reqEndMin > blockStartMin;
  });

  let query = supabase
    .from("lessons")
    .select("id, start_time, end_time")
    .eq("date", date)
    .eq("status", "confirmed");
  if (excludeLessonId) query = query.neq("id", excludeLessonId);
  const { data: existing } = await query;

  const doubleBooked = (existing ?? []).some((l) => {
    const existingStart = timeStrToMinutes(l.start_time.slice(0, 5));
    const existingEnd = timeStrToMinutes(l.end_time.slice(0, 5));
    return reqStartMin < existingEnd && reqEndMin > existingStart;
  });

  return { blocked, doubleBooked, hasConflict: blocked || doubleBooked };
}

export function addMinutesToTime(startTime: string, durationMinutes: number) {
  const startLocal = new Date(`2000-01-01T${startTime}:00`);
  const endLocal = new Date(startLocal.getTime() + durationMinutes * 60000);
  const crossesMidnight = endLocal.getDate() !== startLocal.getDate();
  const endTime = `${String(endLocal.getHours()).padStart(2, "0")}:${String(endLocal.getMinutes()).padStart(2, "0")}`;
  return { endTime, crossesMidnight };
}
