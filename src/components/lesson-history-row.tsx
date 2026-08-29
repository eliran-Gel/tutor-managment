import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CancelLessonButton } from "@/components/cancel-lesson-button";
import { DeleteLessonHistoryButton } from "@/components/delete-lesson-history-button";
import { LESSON_STATUS_LABELS, LESSON_STATUS_TONE, DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";
import type { LessonHistoryRow as LessonHistoryRowData } from "@/lib/lesson-history";

const DELETABLE_STATUSES = new Set(["rejected", "cancelled"]);

export function LessonHistoryRow({
  row,
  showCancelAction = false,
  studentId,
}: {
  row: LessonHistoryRowData;
  showCancelAction?: boolean;
  /** Enables the permanent-delete action for dead-end statuses (rejected/
   * cancelled) - omit to hide it (e.g. contexts where studentId isn't
   * cheaply available). */
  studentId?: string;
}) {
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
      <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
        <span className="text-sm font-medium text-text-secondary">₪{row.price_charged}</span>
        <Badge tone={row.payment_status === "paid" ? "confirmed" : "pending"}>
          {row.payment_status === "paid" ? "שולם" : "לא שולם"}
        </Badge>
        <Badge tone={LESSON_STATUS_TONE[lesson.status]}>{LESSON_STATUS_LABELS[lesson.status]}</Badge>
        <Link
          href={`/tutor/lessons/${lesson.id}`}
          className="text-sm font-medium text-brand-accent transition-transform duration-200 hover:underline active:scale-90"
        >
          ניהול שיעור ←
        </Link>
        {showCancelAction && lesson.status === "confirmed" && <CancelLessonButton lessonId={lesson.id} />}
        {studentId && DELETABLE_STATUSES.has(lesson.status) && (
          <DeleteLessonHistoryButton lessonId={lesson.id} studentId={studentId} />
        )}
      </div>
    </div>
  );
}
