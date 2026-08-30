import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchLessonsInRange } from "@/lib/lessons-in-range";
import { LESSON_STATUS_LABELS, LESSON_STATUS_TONE, DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDate, formatIsoDateWithWeekday } from "@/lib/dates/format";

export default async function CalendarRangePage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; label?: string }>;
}) {
  const { start, end, label } = await searchParams;
  if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) notFound();

  const supabase = await createClient();
  const rows = await fetchLessonsInRange(supabase, start, end);

  const billable = rows.filter((r) => r.status === "confirmed" || r.status === "completed");
  const totalPrice = billable.reduce(
    (sum, r) => sum + r.lesson_participants.reduce((s, p) => s + p.price_charged, 0),
    0,
  );

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = groups.get(row.date) ?? [];
    list.push(row);
    groups.set(row.date, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/tutor/dashboard"
          className="inline-block text-sm font-medium text-text-secondary transition-transform duration-200 hover:text-text-primary active:scale-90"
        >
          ‹ חזרה לדף הראשי
        </Link>
        <h1 className="mt-1 text-xl font-bold font-display text-text-primary">
          כל השיעורים · {label ?? `${formatIsoDate(start)}–${formatIsoDate(end)}`}
        </h1>
        <p className="text-sm text-text-secondary">
          {formatIsoDate(start)}–{formatIsoDate(end)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:w-fit">
        <Card>
          <p className="text-sm text-text-secondary">שיעורים</p>
          <p className="mt-2 text-2xl font-bold font-display text-text-primary">{billable.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">סה&quot;כ מחיר</p>
          <p className="mt-2 text-2xl font-bold font-display text-text-primary">₪{totalPrice.toLocaleString("he-IL")}</p>
        </Card>
      </div>

      {rows.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">אין שיעורים בתקופה זו.</p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {Array.from(groups.entries()).map(([date, dateRows]) => (
          <div key={date} className="flex flex-col gap-2">
            <Link
              href={`/tutor/calendar/day/${date}`}
              className="text-sm font-semibold text-text-secondary transition-transform duration-200 hover:text-brand-accent active:scale-95"
            >
              {formatIsoDateWithWeekday(date)} ←
            </Link>
            {dateRows.map((lesson) => {
              const studentNames = lesson.lesson_participants
                .map((lp) => lp.students?.display_name)
                .filter((name): name is string => Boolean(name));
              const price = lesson.lesson_participants.reduce((s, p) => s + p.price_charged, 0);

              return (
                <Card key={lesson.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary">
                      {lesson.start_time.slice(0, 5)}–{lesson.end_time.slice(0, 5)} ·{" "}
                      {lesson.subjects?.name ?? "שיעור"}
                    </p>
                    <p className="mt-1 text-sm text-text-primary">
                      {studentNames.length > 0 ? studentNames.join(", ") : "ללא תלמיד/ה משויכ/ת"}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {DELIVERY_MODE_LABELS[lesson.delivery_mode]}
                      {lesson.topic && ` · ${lesson.topic}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {price > 0 && <span className="text-sm font-medium text-text-secondary">₪{price}</span>}
                    <Badge tone={LESSON_STATUS_TONE[lesson.status]}>{LESSON_STATUS_LABELS[lesson.status]}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
