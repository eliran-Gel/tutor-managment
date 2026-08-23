import { Badge } from "@/components/ui/badge";
import { LESSON_STATUS_LABELS, LESSON_STATUS_TONE, DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";
import type { LessonHistoryRow as LessonHistoryRowData } from "@/lib/lesson-history";

export function LessonHistoryRow({ row }: { row: LessonHistoryRowData }) {
  const lesson = row.lessons;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">
          {formatIsoDateWithWeekday(lesson.date)} · {lesson.start_time.slice(0, 5)}–{lesson.end_time.slice(0, 5)}
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
}
