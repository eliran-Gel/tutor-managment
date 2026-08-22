import type { Database } from "@/types/database";

type LessonType = Database["public"]["Enums"]["lesson_type"];

// Mirrors the SQL function public.calculate_lesson_price(), which is the
// actual source of truth for what gets charged (see the fixed_pricing
// migration) - this copy is for display only, e.g. showing the tutor the
// price before they submit a booking.
const PRICE_TABLE: Record<LessonType, Record<number, number>> = {
  individual: { 60: 140, 90: 210, 120: 280 },
  group: { 60: 110, 90: 165, 120: 220 },
};

export function calculateLessonPrice(lessonType: LessonType, durationMinutes: number): number {
  const table = PRICE_TABLE[lessonType];
  if (durationMinutes in table) return table[durationMinutes];
  const perHour = lessonType === "individual" ? 140 : 110;
  return Math.round(((perHour * durationMinutes) / 60) * 100) / 100;
}
