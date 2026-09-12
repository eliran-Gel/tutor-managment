import type { SupabaseClient } from "@supabase/supabase-js";
import { toAppTime } from "@/lib/dates/timezone";
import { blocksForDate, type AvailabilityBlock } from "@/lib/availability";
import { timeStrToMinutes } from "@/lib/lesson-conflicts";
import type { Database } from "@/types/database";

export type DayAvailability = "open" | "full" | "closed";

type WorkingHoursRow = { day_of_week: number; is_open: boolean; start_time: string | null; end_time: string | null };
type AdditionRow = { date: string; start_time: string; end_time: string };
type OccupiedRange = { start: number; end: number };

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Same "is there a free slot" logic as checkLessonConflicts (a one-time
 * addition overrides the recurring weekly window entirely; otherwise falls
 * back to tutor_working_hours for that weekday), just computed once per day
 * from data already fetched for the whole month instead of one query per
 * day - "closed" means not a teaching day at all, "full" means it is one
 * but every hourly slot is already blocked or booked.
 */
function computeDayAvailability(
  day: Date,
  workingHoursByDow: Map<number, WorkingHoursRow>,
  additionsByDate: Map<string, AdditionRow>,
  dayBlocks: AvailabilityBlock[],
  occupied: OccupiedRange[],
): DayAvailability {
  const addition = additionsByDate.get(toIsoDate(day));
  const workingHours = workingHoursByDow.get(day.getDay());
  const effective = addition ?? (workingHours?.is_open ? workingHours : null);
  if (!effective || !effective.start_time || !effective.end_time) return "closed";

  const startMin = timeStrToMinutes(effective.start_time.slice(0, 5));
  const endMin = timeStrToMinutes(effective.end_time.slice(0, 5));

  const blockedRanges = dayBlocks.map((block) => {
    const s = toAppTime(block.start_at);
    const e = toAppTime(block.end_at);
    return { start: s.getHours() * 60 + s.getMinutes(), end: e.getHours() * 60 + e.getMinutes() };
  });

  for (let slot = startMin; slot + 60 <= endMin; slot += 60) {
    const slotEnd = slot + 60;
    const blocked = blockedRanges.some((b) => slot < b.end && slotEnd > b.start);
    const taken = occupied.some((o) => slot < o.end && slotEnd > o.start);
    if (!blocked && !taken) return "open";
  }
  return "full";
}

/**
 * Per-day open/full/closed status for every day of `month` (0-indexed, like
 * Date#getMonth) in `year` - lets a date picker show availability at a
 * glance instead of the student/tutor discovering a fully-booked or
 * non-teaching day only after picking it.
 */
export async function getMonthAvailability(
  supabase: SupabaseClient<Database>,
  year: number,
  month: number,
): Promise<Record<string, DayAvailability>> {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstIso = toIsoDate(first);
  const lastIso = toIsoDate(last);

  const [{ data: workingHours }, { data: additions }, { data: blocks }, { data: lessons }] = await Promise.all([
    supabase.from("tutor_working_hours").select("day_of_week, is_open, start_time, end_time"),
    supabase
      .from("availability_additions")
      .select("date, start_time, end_time")
      .gte("date", firstIso)
      .lte("date", lastIso),
    supabase.from("availability_blocks").select("*"),
    supabase
      .from("lessons")
      .select("date, start_time, end_time")
      .eq("status", "confirmed")
      .gte("date", firstIso)
      .lte("date", lastIso),
  ]);

  const workingHoursByDow = new Map((workingHours ?? []).map((w) => [w.day_of_week, w]));
  const additionsByDate = new Map((additions ?? []).map((a) => [a.date, a]));

  const occupiedByDate = new Map<string, OccupiedRange[]>();
  for (const lesson of lessons ?? []) {
    const list = occupiedByDate.get(lesson.date) ?? [];
    list.push({ start: timeStrToMinutes(lesson.start_time.slice(0, 5)), end: timeStrToMinutes(lesson.end_time.slice(0, 5)) });
    occupiedByDate.set(lesson.date, list);
  }

  const result: Record<string, DayAvailability> = {};
  for (let dayNum = 1; dayNum <= last.getDate(); dayNum++) {
    const day = new Date(year, month, dayNum);
    const iso = toIsoDate(day);
    result[iso] = computeDayAvailability(
      day,
      workingHoursByDow,
      additionsByDate,
      blocksForDate(blocks ?? [], day),
      occupiedByDate.get(iso) ?? [],
    );
  }
  return result;
}
