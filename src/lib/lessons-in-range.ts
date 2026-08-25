import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type LessonInRange = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: Database["public"]["Enums"]["lesson_status"];
  delivery_mode: Database["public"]["Enums"]["delivery_mode"];
  topic: string | null;
  subjects: { name: string } | null;
  lesson_participants: { price_charged: number; students: { display_name: string } | null }[];
};

export async function fetchLessonsInRange(
  supabase: SupabaseClient<Database>,
  start: string,
  end: string,
): Promise<LessonInRange[]> {
  const { data } = await supabase
    .from("lessons")
    .select(
      "id, date, start_time, end_time, status, delivery_mode, topic, subjects(name), lesson_participants(price_charged, students(display_name))",
    )
    .gte("date", start)
    .lte("date", end)
    .in("status", ["confirmed", "completed", "requested"])
    .order("date")
    .order("start_time");
  return data ?? [];
}
