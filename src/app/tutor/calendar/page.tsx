import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildMonthGrid, HEBREW_WEEKDAY_LABELS } from "@/lib/calendar-grid";
import { blocksForDate } from "@/lib/availability";
import { formatAppTime } from "@/lib/dates/timezone";
import { cn } from "@/lib/cn";
import { NewLessonModal } from "./new-lesson-modal";

const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const now = new Date();
  const { year: yearParam, month: monthParam } = await searchParams;
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;

  const { weeks, isCurrentMonth } = buildMonthGrid(year, month);
  const gridStart = weeks[0][0];
  const gridEnd = weeks[weeks.length - 1][6];

  const supabase = await createClient();
  const [{ data: blocks }, { data: lessons }, { data: students }, { data: subjects }] = await Promise.all([
    supabase.from("availability_blocks").select("*"),
    supabase
      .from("lessons")
      .select("id, date, start_time, end_time, status, subjects(name)")
      .in("status", ["confirmed", "completed", "requested"])
      .gte("date", toIsoDate(gridStart))
      .lte("date", toIsoDate(gridEnd)),
    supabase
      .from("students")
      .select("id, display_name")
      .is("archived_at", null)
      .order("display_name"),
    supabase.from("subjects").select("*").eq("active", true).order("name"),
  ]);

  const lessonsByDate = new Map<string, NonNullable<typeof lessons>>();
  for (const lesson of lessons ?? []) {
    const list = lessonsByDate.get(lesson.date) ?? [];
    list.push(lesson);
    lessonsByDate.set(lesson.date, list);
  }

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const isViewingCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary">יומן</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/tutor/calendar"
            aria-disabled={isViewingCurrentMonth}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-control border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-transform duration-200 hover:bg-surface-muted active:scale-90",
              isViewingCurrentMonth && "pointer-events-none opacity-40",
            )}
          >
            היום
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`/tutor/calendar?year=${prevMonth.year}&month=${prevMonth.month}`}
              aria-label="חודש קודם"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-border text-text-secondary transition-transform duration-200 hover:bg-surface-muted active:scale-85"
            >
              ‹
            </Link>
            <p className="min-w-32 shrink-0 whitespace-nowrap text-center text-sm font-medium text-text-primary">
              {HEBREW_MONTHS[month - 1]} {year}
            </p>
            <Link
              href={`/tutor/calendar?year=${nextMonth.year}&month=${nextMonth.month}`}
              aria-label="חודש הבא"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-border text-text-secondary transition-transform duration-200 hover:bg-surface-muted active:scale-85"
            >
              ›
            </Link>
          </div>

          <NewLessonModal students={students ?? []} subjects={subjects ?? []} />
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Negative margin reclaims the Card's own padding on mobile only,
            so the 7-column grid gets the extra width it needs to fit the
            whole month on one screen without horizontal scrolling. */}
        <div className="-mx-5 -my-5 grid grid-cols-7 gap-px bg-border sm:mx-0 sm:my-0">
          {HEBREW_WEEKDAY_LABELS.map((label) => (
            <div key={label} className="bg-surface py-1.5 text-center text-[10px] font-semibold text-text-muted sm:py-2 sm:text-xs">
              {label}
            </div>
          ))}

          {weeks.flatMap((week) =>
            week.map((day) => {
              const dayBlocks = blocksForDate(blocks ?? [], day);
              const dayLessons = lessonsByDate.get(toIsoDate(day)) ?? [];
              const confirmedLessons = dayLessons.filter((l) => l.status !== "requested");
              const requestedLessons = dayLessons.filter((l) => l.status === "requested");
              const inMonth = isCurrentMonth(day);
              const isToday = day.toDateString() === now.toDateString();

              return (
                <Link
                  key={day.toISOString()}
                  href={`/tutor/calendar/day/${toIsoDate(day)}`}
                  className={cn(
                    "flex min-h-12 flex-col items-center gap-0.5 bg-surface p-1 transition duration-200 hover:bg-surface-muted active:scale-95 active:bg-surface-muted sm:min-h-24 sm:items-stretch sm:p-2",
                    !inMonth && "opacity-40",
                    dayBlocks.length > 0 && "bg-status-destructive-bg",
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] font-medium text-text-secondary sm:text-xs",
                      isToday &&
                        "flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-white",
                    )}
                  >
                    {day.getDate()}
                  </p>

                  {/* Mobile: dot indicators only, so the whole month still fits the screen at once. */}
                  {(dayBlocks.length > 0 || confirmedLessons.length > 0 || requestedLessons.length > 0) && (
                    <div className="flex gap-0.5 sm:hidden">
                      {dayBlocks.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-status-destructive" />}
                      {confirmedLessons.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-status-confirmed" />}
                      {requestedLessons.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-status-pending" />}
                    </div>
                  )}

                  {/* sm and up: full text previews. */}
                  <div className="hidden sm:block">
                    {dayBlocks.map((block) => (
                      <p key={block.id} className="mt-1 truncate text-xs text-status-destructive">
                        חסום {formatAppTime(block.start_at, "HH:mm")}–{formatAppTime(block.end_at, "HH:mm")}
                      </p>
                    ))}
                    {confirmedLessons.map((lesson) => (
                      <div key={lesson.id} className="mt-1 truncate rounded bg-status-confirmed-bg px-1 py-0.5">
                        <p className="truncate text-xs font-medium text-status-confirmed">
                          {lesson.start_time.slice(0, 5)} {lesson.subjects?.name ?? "שיעור"}
                        </p>
                      </div>
                    ))}
                    {requestedLessons.map((lesson) => (
                      <div key={lesson.id} className="mt-1 truncate rounded bg-status-pending-bg px-1 py-0.5">
                        <p className="truncate text-xs font-medium text-status-pending">
                          {lesson.start_time.slice(0, 5)} {lesson.subjects?.name ?? "שיעור"} (ממתין)
                        </p>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            }),
          )}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <Badge tone="confirmed" className="h-3 w-3 rounded-full p-0" /> שיעור מאושר
        </span>
        <span className="flex items-center gap-1.5">
          <Badge tone="pending" className="h-3 w-3 rounded-full p-0" /> בקשה ממתינה
        </span>
        <span className="flex items-center gap-1.5">
          <Badge tone="destructive" className="h-3 w-3 rounded-full p-0" /> זמן חסום
        </span>
      </div>
    </div>
  );
}
