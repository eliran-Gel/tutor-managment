import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type LessonHistoryRow = {
  price_charged: number;
  payment_status: Database["public"]["Enums"]["payment_status"];
  lessons: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: Database["public"]["Enums"]["lesson_status"];
    lesson_type: Database["public"]["Enums"]["lesson_type"];
    delivery_mode: Database["public"]["Enums"]["delivery_mode"];
    topic: string | null;
    subjects: { name: string } | null;
  };
};

export async function fetchLessonHistory(supabase: SupabaseClient<Database>, studentId: string) {
  const { data } = await supabase
    .from("lesson_participants")
    .select(
      "price_charged, payment_status, lessons(id, date, start_time, end_time, status, lesson_type, delivery_mode, topic, subjects(name))",
    )
    .eq("student_id", studentId);

  const rows = ((data ?? []) as LessonHistoryRow[])
    .filter((row) => row.lessons)
    .sort((a, b) => {
      const dateCompare = b.lessons.date.localeCompare(a.lessons.date);
      return dateCompare !== 0 ? dateCompare : b.lessons.start_time.localeCompare(a.lessons.start_time);
    });

  return rows;
}
