"use server";

import { createClient } from "@/lib/supabase/server";
import { getMonthAvailability, type DayAvailability } from "@/lib/day-availability";

// Same tables checkLessonConflicts already reads through the caller's own
// RLS-scoped client (tutor_working_hours / availability_additions /
// availability_blocks / confirmed lessons) - a student or parent can
// already learn a given date's free times via getAvailableStartTimesAction,
// this just does it for every day of a month at once.
export async function getMonthAvailabilityAction(year: number, month: number): Promise<Record<string, DayAvailability>> {
  const supabase = await createClient();
  return getMonthAvailability(supabase, year, month);
}
