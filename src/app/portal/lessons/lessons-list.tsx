"use client";

import { useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LESSON_STATUS_LABELS, LESSON_STATUS_TONE, DELIVERY_MODE_LABELS, type LessonStatus } from "@/lib/lessons";
import { formatIsoDate } from "@/lib/dates/format";
import { cn } from "@/lib/cn";
import { RequestChangeModal } from "./request-change-modal";
import { RequestLessonModal } from "./request-lesson-modal";
import { cancelLessonRequest, deleteLessonFromHistory } from "./actions";
import type { Tables } from "@/types/database";

type LessonRow = Tables<"lessons"> & { subjects: { name: string } | null };

const DELETABLE_STATUSES = new Set(["rejected", "cancelled"]);

// How far back to look. Upcoming lessons are never hidden by these - a range
// only trims the past.
const PERIOD_OPTIONS = [
  { key: "month", label: "חודש אחרון", days: 30 },
  { key: "3months", label: "3 חודשים", days: 91 },
  { key: "6months", label: "חצי שנה", days: 183 },
  { key: "year", label: "שנה", days: 365 },
  { key: "all", label: "מאז ומתמיד", days: null },
] as const;
type PeriodKey = (typeof PERIOD_OPTIONS)[number]["key"];

function cutoffIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CancelRequestButton({ lessonId }: { lessonId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => setConfirming(false)}>
            חזרה
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await cancelLessonRequest(lessonId);
                if (result?.error) setError(result.error);
                else setConfirming(false);
              })
            }
          >
            {isPending ? "מבטל..." : "כן, לבטל בקשה"}
          </Button>
        </div>
        {error && <p className="max-w-56 break-words text-xs text-status-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <Button type="button" variant="secondary" className="text-xs" onClick={() => setConfirming(true)}>
      ביטול בקשה
    </Button>
  );
}

function DeleteHistoryButton({ lessonId }: { lessonId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => setConfirming(false)}>
            חזרה
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await deleteLessonFromHistory(lessonId);
                if (result?.error) setError(result.error);
                else setConfirming(false);
              })
            }
          >
            {isPending ? "מוחק..." : "כן, מחיקה"}
          </Button>
        </div>
        {error && <p className="max-w-56 break-words text-xs text-status-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <Button type="button" variant="secondary" className="text-xs" onClick={() => setConfirming(true)}>
      מחיקה
    </Button>
  );
}

export function LessonsList({ lessons, subjects, isTutor }: { lessons: LessonRow[]; subjects: Tables<"subjects">[]; isTutor: boolean }) {
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [statusFilter, setStatusFilter] = useState<LessonStatus | "all">("all");

  const statusesPresent = useMemo(() => Array.from(new Set(lessons.map((l) => l.status))), [lessons]);
  const filtered = useMemo(() => {
    const days = PERIOD_OPTIONS.find((p) => p.key === period)?.days ?? null;
    const cutoff = days === null ? null : cutoffIso(days);
    return lessons
      .filter((l) => cutoff === null || l.date >= cutoff)
      .filter((l) => statusFilter === "all" || l.status === statusFilter);
  }, [lessons, period, statusFilter]);

  if (lessons.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-muted">אין עדיין שיעורים או בקשות.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setPeriod(option.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              period === option.key
                ? "border-brand-highlight-strong bg-brand-highlight font-semibold text-text-primary"
                : "border-border text-text-secondary hover:bg-surface-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            statusFilter === "all"
              ? "border-brand-accent bg-brand-accent text-white"
              : "border-border text-text-secondary hover:bg-surface-muted",
          )}
        >
          כל הסטטוסים
        </button>
        {statusesPresent.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === status
                ? "border-brand-highlight-strong bg-brand-highlight font-semibold text-text-primary"
                : "border-border text-text-secondary hover:bg-surface-muted",
            )}
          >
            {LESSON_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <Card>
            <p className="text-sm text-text-muted">אין שיעורים בתקופה או בסטטוס שנבחרו.</p>
          </Card>
        )}
        {filtered.map((lesson) => {
          const isPast = new Date(`${lesson.date}T${lesson.start_time}`) < new Date();
          return (
            <Card key={lesson.id} className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="break-words font-medium text-text-primary">{lesson.subjects?.name ?? "ללא מקצוע"}</p>
                  <Badge tone={LESSON_STATUS_TONE[lesson.status]}>{LESSON_STATUS_LABELS[lesson.status]}</Badge>
                </div>
                {!isTutor && !isPast && lesson.status === "confirmed" && (
                  <RequestChangeModal
                    lessonId={lesson.id}
                    currentDate={lesson.date}
                    currentStartTime={lesson.start_time}
                    currentDurationMinutes={lesson.duration_minutes}
                    subjects={subjects}
                  />
                )}
                {!isTutor && lesson.status === "requested" && (
                  <div className="flex shrink-0 items-center gap-2">
                    <RequestLessonModal
                      subjects={subjects}
                      triggerLabel="עריכה"
                      triggerVariant="secondary"
                      triggerClassName="text-xs"
                      editingLesson={{
                        id: lesson.id,
                        date: lesson.date,
                        start_time: lesson.start_time,
                        duration_minutes: lesson.duration_minutes,
                        subject_id: lesson.subject_id ?? "",
                        delivery_mode: lesson.delivery_mode,
                        topic: lesson.topic,
                      }}
                    />
                    <CancelRequestButton lessonId={lesson.id} />
                  </div>
                )}
                {!isTutor && DELETABLE_STATUSES.has(lesson.status) && <DeleteHistoryButton lessonId={lesson.id} />}
              </div>
              <p className="mt-1 break-words text-sm text-text-muted">
                {formatIsoDate(lesson.date)} · {lesson.start_time.slice(0, 5)}–{lesson.end_time.slice(0, 5)} ·{" "}
                {DELIVERY_MODE_LABELS[lesson.delivery_mode]}
              </p>
              {lesson.topic && <p className="mt-1 break-words text-sm text-text-secondary">{lesson.topic}</p>}
              {lesson.status === "rejected" && lesson.rejection_reason && (
                <p className="mt-1 break-words text-sm text-status-destructive">
                  הערת המורה: {lesson.rejection_reason}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
