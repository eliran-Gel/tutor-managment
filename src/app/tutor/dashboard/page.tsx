import Link from "next/link";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";
import { getHebrewGreeting } from "@/lib/greeting";
import { fetchOverduePayments } from "@/lib/payments";
import { Reveal } from "@/components/reveal";
import { AnimatedCounter } from "@/components/animated-counter";

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function TutorDashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const now = new Date();
  const today = toIsoDate(now);
  const weekStart = toIsoDate(startOfWeek(now, { weekStartsOn: 0 }));
  const weekEnd = toIsoDate(endOfWeek(now, { weekStartsOn: 0 }));
  const monthStart = toIsoDate(startOfMonth(now));
  const monthEnd = toIsoDate(endOfMonth(now));

  // The week can spill into the previous/next month, so fetch the union of
  // both ranges - otherwise a week count near a month boundary undercounts.
  const rangeStart = weekStart < monthStart ? weekStart : monthStart;
  const rangeEnd = weekEnd > monthEnd ? weekEnd : monthEnd;

  const [{ count: activeStudents }, { data: pendingRequests }, { data: rangeLessons }, overduePayments] =
    await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).is("archived_at", null),
      supabase
        .from("lessons")
        .select("*, subjects(name), requester:profiles!lessons_created_by_fkey(full_name, email)")
        .eq("status", "requested")
        .order("created_at")
        .limit(5),
      // Lessons in the today/week/month union range - fetched once and
      // sliced below, instead of 3 separate round trips.
      supabase
        .from("lessons")
        .select("date, lesson_participants(price_charged)")
        .in("status", ["confirmed", "completed"])
        .gte("date", rangeStart)
        .lte("date", rangeEnd),
      fetchOverduePayments(supabase),
    ]);

  const lessonRows = rangeLessons ?? [];
  function statsFor(from: string, to: string) {
    const inRange = lessonRows.filter((l) => l.date >= from && l.date <= to);
    const price = inRange.reduce(
      (sum, l) => sum + l.lesson_participants.reduce((s, p) => s + p.price_charged, 0),
      0,
    );
    return { count: inRange.length, price };
  }

  const todayStats = statsFor(today, today);
  const weekStats = statsFor(weekStart, weekEnd);
  const monthStats = statsFor(monthStart, monthEnd);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">
          {getHebrewGreeting()}{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-sm text-text-secondary">לחצו על כל קוביה כדי לראות את השיעורים המלאים.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Reveal delay={0}>
          <Link href="/tutor/students" className="block transition-transform duration-200 active:scale-95">
            <Card className="h-full transition-shadow hover:shadow-none">
              <p className="text-sm text-text-secondary">תלמידים פעילים</p>
              <p className="mt-2 text-2xl font-bold font-display text-text-primary">
                <AnimatedCounter value={activeStudents ?? 0} />
              </p>
            </Card>
          </Link>
        </Reveal>

        <Reveal delay={0.05}>
          <Link href={`/tutor/calendar/day/${today}`} className="block transition-transform duration-200 active:scale-95">
            <Card className="h-full transition-shadow hover:shadow-none">
              <p className="text-sm text-text-secondary">היום</p>
              <p className="mt-2 text-2xl font-bold font-display text-text-primary">
                <AnimatedCounter value={todayStats.count} />
              </p>
              {todayStats.price > 0 && <p className="mt-0.5 text-sm text-text-secondary">₪{todayStats.price.toLocaleString("he-IL")}</p>}
            </Card>
          </Link>
        </Reveal>

        <Reveal delay={0.1}>
          <Link
            href={`/tutor/calendar/range?start=${weekStart}&end=${weekEnd}&label=${encodeURIComponent("השבוע")}`}
            className="block transition-transform duration-200 active:scale-95"
          >
            <Card className="h-full transition-shadow hover:shadow-none">
              <p className="text-sm text-text-secondary">השבוע</p>
              <p className="mt-2 text-2xl font-bold font-display text-text-primary">
                <AnimatedCounter value={weekStats.count} />
              </p>
              {weekStats.price > 0 && <p className="mt-0.5 text-sm text-text-secondary">₪{weekStats.price.toLocaleString("he-IL")}</p>}
            </Card>
          </Link>
        </Reveal>

        <Reveal delay={0.15}>
          <Link
            href={`/tutor/calendar/range?start=${monthStart}&end=${monthEnd}&label=${encodeURIComponent("החודש")}`}
            className="block transition-transform duration-200 active:scale-95"
          >
            <Card className="h-full transition-shadow hover:shadow-none">
              <p className="text-sm text-text-secondary">החודש</p>
              <p className="mt-2 text-2xl font-bold font-display text-text-primary">
                <AnimatedCounter value={monthStats.count} />
              </p>
              {monthStats.price > 0 && <p className="mt-0.5 text-sm text-text-secondary">₪{monthStats.price.toLocaleString("he-IL")}</p>}
            </Card>
          </Link>
        </Reveal>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle>בקשות לשיעורים ממתינות</CardTitle>
              <Badge tone="pending">{pendingRequests?.length ?? 0}</Badge>
            </CardHeader>
            {pendingRequests && pendingRequests.length === 0 ? (
              <p className="text-sm text-text-muted">אין בקשות ממתינות כרגע.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pendingRequests?.map((req) => (
                  <li key={req.id} className="min-w-0 rounded-control border border-border px-3 py-2 text-sm">
                    <p className="break-words font-medium text-text-primary">
                      {req.requester?.full_name ?? req.requester?.email}
                    </p>
                    <p className="break-words text-text-muted">
                      {req.subjects?.name} · {formatIsoDateWithWeekday(req.date)} · {req.start_time.slice(0, 5)} ·{" "}
                      {DELIVERY_MODE_LABELS[req.delivery_mode]}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/tutor/requests" className="mt-3 inline-block text-sm font-medium text-brand-accent transition-transform duration-200 hover:underline active:scale-90">
              לכל הבקשות ←
            </Link>
          </Card>
        </Reveal>

        <Reveal delay={0.15}>
          <Card>
            <CardHeader>
              <CardTitle>תשלומים ממתינים</CardTitle>
              <Badge tone="pending">{overduePayments.length}</Badge>
            </CardHeader>
            {overduePayments.length === 0 ? (
              <p className="text-sm text-text-muted">אין תשלומים ממתינים כרגע.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {overduePayments.slice(0, 5).map((row) => (
                  <li key={row.participantId} className="min-w-0 rounded-control border border-border px-3 py-2 text-sm">
                    <p className="break-words font-medium text-text-primary">{row.studentName}</p>
                    <p className="break-words text-text-muted">
                      {row.subjectName} · {formatIsoDateWithWeekday(row.date)} · ₪{row.price}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/tutor/payments" className="mt-3 inline-block text-sm font-medium text-brand-accent transition-transform duration-200 hover:underline active:scale-90">
              לכל התשלומים ←
            </Link>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
