import type { Database } from "@/types/database";

export type LessonStatus = Database["public"]["Enums"]["lesson_status"];

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  requested: "ממתין לאישור",
  confirmed: "מאושר",
  rejected: "נדחה",
  cancelled: "בוטל",
  completed: "הושלם",
  change_requested: "בקשת שינוי",
};

export const LESSON_STATUS_TONE: Record<
  LessonStatus,
  "confirmed" | "pending" | "destructive" | "neutral" | "selected"
> = {
  requested: "pending",
  confirmed: "confirmed",
  rejected: "destructive",
  cancelled: "destructive",
  completed: "neutral",
  change_requested: "selected",
};

// Updated per tutor preference: round time increments only (was 60/120).
export const LESSON_DURATIONS = [15, 30, 45, 60] as const;

export const DELIVERY_MODE_LABELS: Record<Database["public"]["Enums"]["delivery_mode"], string> = {
  online: "מקוון",
  in_person: "פרונטלי",
};
