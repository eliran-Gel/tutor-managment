import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LESSON_STATUS_LABELS, LESSON_STATUS_TONE, DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";
import { createClient } from "@/lib/supabase/server";

export async function LessonHistoryCard({ studentId }: { studentId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_participants")
    .select(
      "price_charged, payment_status, lessons(id, date, start_time, end_time, status, lesson_type, delivery_mode, topic, subjects(name))",
    )
    .eq("student_id", studentId);

  const rows = (data ?? [])
    .filter((row) => row.lessons)
    .sort((a, b) => {
      const dateCompare = b.lessons!.date.localeCompare(a.lessons!.date);
      return dateCompare !== 0 ? dateCompare : b.lessons!.start_time.localeCompare(a.lessons!.start_time);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>היסטוריית שיעורים</CardTitle>
        <Badge tone="neutral">{rows.length}</Badge>
      </CardHeader>

      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">אין עדיין שיעורים לתלמיד/ה זה.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const lesson = row.lessons!;
            return (
              <div
                key={lesson.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {formatIsoDateWithWeekday(lesson.date)} · {lesson.start_time.slice(0, 5)}–
                    {lesson.end_time.slice(0, 5)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {lesson.subjects?.name ?? "שיעור"} · {lesson.lesson_type === "group" ? "קבוצתי" : "יחיד"} ·{" "}
                    {DELIVERY_MODE_LABELS[lesson.delivery_mode]}
                    {lesson.topic && ` · ${lesson.topic}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium text-text-secondary">₪{row.price_charged}</span>
                  <Badge tone={row.payment_status === "paid" ? "confirmed" : "pending"}>
                    {row.payment_status === "paid" ? "שולם" : "לא שולם"}
                  </Badge>
                  <Badge tone={LESSON_STATUS_TONE[lesson.status]}>{LESSON_STATUS_LABELS[lesson.status]}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted">
        שיעורי בית וסיכומי שיעורים יופיעו כאן בהמשך, לאחר שהתכונות האלה ייבנו.
      </p>
    </Card>
  );
}
