import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LESSON_STATUS_LABELS, LESSON_STATUS_TONE, DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { blocksForDate } from "@/lib/availability";
import { formatAppTime } from "@/lib/dates/timezone";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";
import { CancelLessonButton } from "@/components/cancel-lesson-button";

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function CalendarDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const dayLocal = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dayLocal.getTime())) notFound();

  const supabase = await createClient();
  const [{ data: lessons }, { data: blocks }] = await Promise.all([
    supabase
      .from("lessons")
      .select(
        "id, start_time, end_time, status, delivery_mode, topic, subjects(name), lesson_participants(students(display_name)), requester:profiles!lessons_created_by_fkey(full_name, email)",
      )
      .eq("date", date)
      .in("status", ["confirmed", "completed", "requested"])
      .order("start_time"),
    supabase.from("availability_blocks").select("*"),
  ]);

  const dayBlocks = blocksForDate(blocks ?? [], dayLocal);
  const prevDate = toIsoDate(subDays(dayLocal, 1));
  const nextDate = toIsoDate(addDays(dayLocal, 1));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/tutor/calendar"
            className="inline-block text-sm font-medium text-text-secondary transition-transform duration-200 hover:text-text-primary active:scale-90"
          >
            ‹ חזרה ליומן החודשי
          </Link>
          <h1 className="mt-1 text-xl font-bold text-text-primary">{formatIsoDateWithWeekday(date)}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/tutor/calendar/day/${prevDate}`}
            className="flex h-8 w-8 items-center justify-center rounded-control border border-border text-text-secondary transition-transform duration-200 hover:bg-surface-muted active:scale-85"
            aria-label="יום קודם"
          >
            ‹
          </Link>
          <Link
            href={`/tutor/calendar/day/${nextDate}`}
            className="flex h-8 w-8 items-center justify-center rounded-control border border-border text-text-secondary transition-transform duration-200 hover:bg-surface-muted active:scale-85"
            aria-label="יום הבא"
          >
            ›
          </Link>
        </div>
      </div>

      {dayBlocks.map((block) => (
        <Card key={block.id} className="border-status-destructive bg-status-destructive-bg">
          <p className="text-sm font-medium text-status-destructive">
            זמן חסום: {formatAppTime(block.start_at, "HH:mm")}–{formatAppTime(block.end_at, "HH:mm")}
            {block.note && ` · ${block.note}`}
          </p>
        </Card>
      ))}

      {(!lessons || lessons.length === 0) && dayBlocks.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">אין שיעורים או חסימות ביום זה.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {lessons?.map((lesson) => {
          const studentNames = lesson.lesson_participants
            .map((lp) => lp.students?.display_name)
            .filter((name): name is string => Boolean(name));
          // A still-pending request has no lesson_participants row yet
          // (that's only created on approval) - fall back to who asked.
          const displayNames =
            studentNames.length > 0
              ? studentNames
              : [lesson.requester?.full_name ?? lesson.requester?.email].filter(
                  (name): name is string => Boolean(name),
                );

          return (
            <Card key={lesson.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-text-primary">
                  {lesson.start_time.slice(0, 5)}–{lesson.end_time.slice(0, 5)} · {lesson.subjects?.name ?? "שיעור"}
                </p>
                <p className="mt-1 text-sm text-text-primary">
                  {displayNames.length > 0 ? displayNames.join(", ") : "ללא תלמיד/ה משויכ/ת"}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {DELIVERY_MODE_LABELS[lesson.delivery_mode]}
                  {lesson.topic && ` · ${lesson.topic}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={LESSON_STATUS_TONE[lesson.status]}>{LESSON_STATUS_LABELS[lesson.status]}</Badge>
                {lesson.status === "confirmed" && <CancelLessonButton lessonId={lesson.id} />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
