import Link from "next/link";
import { startOfMonth, startOfYear, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { PAYMENT_METHOD_LABELS } from "@/lib/lessons";

type Period = "month" | "quarter" | "year" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  month: "החודש",
  quarter: "3 חודשים אחרונים",
  year: "השנה",
  all: "מאז ומתמיד",
};

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function periodStart(period: Period, now: Date): string | null {
  switch (period) {
    case "month":
      return toIsoDate(startOfMonth(now));
    case "quarter":
      return toIsoDate(startOfMonth(subMonths(now, 2)));
    case "year":
      return toIsoDate(startOfYear(now));
    case "all":
      return null;
  }
}

function money(n: number) {
  return `₪${n.toLocaleString("he-IL")}`;
}

export default async function TutorAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period: Period = (["month", "quarter", "year", "all"] as const).includes(periodParam as Period)
    ? (periodParam as Period)
    : "month";

  const supabase = await createClient();
  const now = new Date();
  const from = periodStart(period, now);

  let incomeQuery = supabase.from("v_lesson_income").select("*");
  if (from) incomeQuery = incomeQuery.gte("date", from);
  const [{ data: incomeRows }, { data: activityRows }] = await Promise.all([
    incomeQuery,
    supabase.from("v_student_activity").select("*"),
  ]);

  const rows = incomeRows ?? [];
  const totalLessons = rows.length;
  const totalHours = rows.reduce((s, r) => s + (r.duration_minutes ?? 0), 0) / 60;
  const expectedIncome = rows.reduce((s, r) => s + (r.price_charged ?? 0), 0);
  const receivedIncome = rows.filter((r) => r.payment_status === "paid").reduce((s, r) => s + (r.price_charged ?? 0), 0);

  const bySubject = new Map<string, { name: string; count: number; expected: number; received: number }>();
  const byStudent = new Map<string, { name: string; count: number; expected: number; received: number }>();
  const byMethod = new Map<string, { count: number; total: number }>();

  for (const r of rows) {
    const subjectKey = r.subject_id ?? "none";
    const subjectEntry = bySubject.get(subjectKey) ?? { name: r.subject_name ?? "ללא מקצוע", count: 0, expected: 0, received: 0 };
    subjectEntry.count += 1;
    subjectEntry.expected += (r.price_charged ?? 0);
    if (r.payment_status === "paid") subjectEntry.received += (r.price_charged ?? 0);
    bySubject.set(subjectKey, subjectEntry);

    const studentKey = r.student_id ?? "none";
    const studentEntry = byStudent.get(studentKey) ?? { name: r.student_name ?? "תלמיד/ה", count: 0, expected: 0, received: 0 };
    studentEntry.count += 1;
    studentEntry.expected += (r.price_charged ?? 0);
    if (r.payment_status === "paid") studentEntry.received += (r.price_charged ?? 0);
    byStudent.set(studentKey, studentEntry);

    if (r.payment_status === "paid") {
      const methodKey = r.payment_method ?? "other";
      const methodEntry = byMethod.get(methodKey) ?? { count: 0, total: 0 };
      methodEntry.count += 1;
      methodEntry.total += (r.price_charged ?? 0);
      byMethod.set(methodKey, methodEntry);
    }
  }

  const subjectRows = Array.from(bySubject.values()).sort((a, b) => b.expected - a.expected);
  const studentRows = Array.from(byStudent.values()).sort((a, b) => b.expected - a.expected);
  const methodRows = Array.from(byMethod.entries()).sort((a, b) => b[1].total - a[1].total);

  const activity = activityRows ?? [];
  const activeStudents = activity.filter((a) => !a.archived_at);
  const newThisPeriod = from ? activity.filter((a) => a.created_at && a.created_at >= from) : activity;
  const oneTimeStudents = activity.filter((a) => a.lesson_count === 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">הכנסות וסטטיסטיקות</h1>
        <p className="text-sm text-text-secondary">סקירה כספית ותפעולית - {PERIOD_LABELS[period]}.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Link
            key={p}
            href={`/tutor/analytics?period=${p}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              p === period
                ? "border-brand-accent bg-brand-accent text-white"
                : "border-border text-text-secondary hover:bg-surface-muted",
            )}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-text-secondary">שיעורים</p>
          <p className="mt-2 text-2xl font-bold font-display text-text-primary">{totalLessons}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">שעות הוראה</p>
          <p className="mt-2 text-2xl font-bold font-display text-text-primary">{totalHours.toLocaleString("he-IL", { maximumFractionDigits: 1 })}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">הכנסה צפויה</p>
          <p className="mt-2 text-2xl font-bold font-display text-text-primary">{money(expectedIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">הכנסה שהתקבלה</p>
          <p className="mt-2 text-2xl font-bold font-display text-status-confirmed">{money(receivedIncome)}</p>
          {expectedIncome > 0 && (
            <p className="mt-0.5 text-xs text-text-muted">
              {Math.round((receivedIncome / expectedIncome) * 100)}% מהצפוי
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>תלמידים פעילים</CardTitle>
          </CardHeader>
          <p className="text-2xl font-bold font-display text-text-primary">{activeStudents.length}</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>תלמידים חדשים · {PERIOD_LABELS[period]}</CardTitle>
          </CardHeader>
          <p className="text-2xl font-bold font-display text-text-primary">{newThisPeriod.length}</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>תלמידים חד-פעמיים</CardTitle>
          </CardHeader>
          <p className="text-2xl font-bold font-display text-text-primary">{oneTimeStudents.length}</p>
          <p className="mt-0.5 text-xs text-text-muted">שיעור אחד בסך הכול, מאז ומתמיד</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>הכנסה לפי מקצוע</CardTitle>
          </CardHeader>
          {subjectRows.length === 0 ? (
            <p className="text-sm text-text-muted">אין נתונים בתקופה זו.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {subjectRows.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-text-primary">{s.name}</p>
                    <p className="text-xs text-text-muted">{s.count} שיעורים</p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="font-medium text-text-primary">{money(s.expected)}</p>
                    <p className="text-xs text-status-confirmed">{money(s.received)} התקבל</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הכנסה לפי תלמיד/ה</CardTitle>
          </CardHeader>
          {studentRows.length === 0 ? (
            <p className="text-sm text-text-muted">אין נתונים בתקופה זו.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {studentRows.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-text-primary">{s.name}</p>
                    <p className="text-xs text-text-muted">{s.count} שיעורים</p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="font-medium text-text-primary">{money(s.expected)}</p>
                    <p className="text-xs text-status-confirmed">{money(s.received)} התקבל</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="lg:w-fit lg:min-w-80">
        <CardHeader>
          <CardTitle>הכנסה שהתקבלה לפי אמצעי תשלום</CardTitle>
        </CardHeader>
        {methodRows.length === 0 ? (
          <p className="text-sm text-text-muted">אין תשלומים שהתקבלו בתקופה זו.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {methodRows.map(([method, data]) => (
              <li key={method} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-text-primary">
                  {PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ?? method}
                </span>
                <span className="text-text-secondary">
                  {data.count} · {money(data.total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
