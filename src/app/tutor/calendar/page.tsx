import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { buildMonthGrid, HEBREW_WEEKDAY_LABELS } from "@/lib/calendar-grid";
import { blocksForDate } from "@/lib/availability";
import { formatAppTime } from "@/lib/dates/timezone";
import { cn } from "@/lib/cn";

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

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const now = new Date();
  const { year: yearParam, month: monthParam } = await searchParams;
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;

  const supabase = await createClient();
  const { data: blocks } = await supabase.from("availability_blocks").select("*");

  const { weeks, isCurrentMonth } = buildMonthGrid(year, month);

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const isViewingCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary">יומן</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/tutor/calendar"
            aria-disabled={isViewingCurrentMonth}
            className={cn(
              "rounded-control border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-muted",
              isViewingCurrentMonth && "pointer-events-none opacity-40",
            )}
          >
            היום
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href={`/tutor/calendar?year=${prevMonth.year}&month=${prevMonth.month}`}
              aria-label="חודש קודם"
              className="flex h-8 w-8 items-center justify-center rounded-control border border-border text-text-secondary hover:bg-surface-muted"
            >
              ‹
            </Link>
            <p className="min-w-32 text-center text-sm font-medium text-text-primary">
              {HEBREW_MONTHS[month - 1]} {year}
            </p>
            <Link
              href={`/tutor/calendar?year=${nextMonth.year}&month=${nextMonth.month}`}
              aria-label="חודש הבא"
              className="flex h-8 w-8 items-center justify-center rounded-control border border-border text-text-secondary hover:bg-surface-muted"
            >
              ›
            </Link>
          </div>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 gap-px bg-border">
          {HEBREW_WEEKDAY_LABELS.map((label) => (
            <div key={label} className="bg-surface py-2 text-center text-xs font-semibold text-text-muted">
              {label}
            </div>
          ))}

          {weeks.flatMap((week) =>
            week.map((day) => {
              const dayBlocks = blocksForDate(blocks ?? [], day);
              const inMonth = isCurrentMonth(day);
              const isToday = day.toDateString() === now.toDateString();

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-24 bg-surface p-2",
                    !inMonth && "opacity-40",
                    dayBlocks.length > 0 && "bg-status-destructive-bg",
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-medium text-text-secondary",
                      isToday && "inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-white",
                    )}
                  >
                    {day.getDate()}
                  </p>
                  {dayBlocks.map((block) => (
                    <p key={block.id} className="mt-1 truncate text-xs text-status-destructive">
                      חסום {formatAppTime(block.start_at, "HH:mm")}–{formatAppTime(block.end_at, "HH:mm")}
                    </p>
                  ))}
                </div>
              );
            }),
          )}
        </div>
      </Card>

      <p className="text-xs text-text-muted">
        לוח השנה מציג כרגע חסימות זמן בלבד. שיעורים מתוזמנים יופיעו כאן בשלב הבא.
      </p>
    </div>
  );
}
