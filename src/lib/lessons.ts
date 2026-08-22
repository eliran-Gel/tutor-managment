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

// Real lesson lengths (was mistakenly 15/30/45/60 - that was meant for
// start-time granularity, not duration; see TIME_SLOT_MINUTES).
export const LESSON_DURATIONS = [60, 90, 120] as const;

// Lessons can only start on the quarter hour - the tutor doesn't book at
// e.g. 16:27, so there's no reason to offer free-form minute entry.
export const TIME_SLOT_MINUTES = 15;

export const DELIVERY_MODE_LABELS: Record<Database["public"]["Enums"]["delivery_mode"], string> = {
  online: "מקוון",
  in_person: "פרונטלי",
};
