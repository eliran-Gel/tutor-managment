import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatIsoDate, HEBREW_WEEKDAYS_FULL } from "@/lib/dates/format";
import { SeriesActions } from "./series-actions";

export default async function TutorSeriesPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: seriesRows } = await supabase
    .from("lesson_series")
    .select("id, weekday, start_time, end_date, student_ids, subjects(name)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  // student_ids is a plain array column, not a foreign-key relation
  // Postgrest can embed - resolved with one extra lookup instead of a join.
  const allStudentIds = Array.from(new Set((seriesRows ?? []).flatMap((s) => s.student_ids)));
  const { data: studentsData } =
    allStudentIds.length > 0
      ? await supabase.from("students").select("id, display_name").in("id", allStudentIds)
      : { data: [] };
  const studentNameById = new Map((studentsData ?? []).map((s) => [s.id, s.display_name]));

  const seriesWithCounts = await Promise.all(
    (seriesRows ?? []).map(async (s) => {
      const { count } = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("series_id", s.id)
        .eq("status", "confirmed")
        .gte("date", today);
      return { ...s, remainingCount: count ?? 0 };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">שיעורים חוזרים</h1>
        <p className="text-sm text-text-secondary">
          סדרות פעילות ומספר המופעים העתידיים שנותרו בכל אחת. סדרה חדשה נוצרת דרך &quot;שיעור חדש&quot; ביומן, עם הסימון &quot;שיעור חוזר כל שבוע&quot;.
        </p>
      </div>

      {seriesWithCounts.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">אין כרגע סדרות פעילות.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {seriesWithCounts.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary">
                  {s.student_ids.map((id) => studentNameById.get(id) ?? "תלמיד/ה").join(", ")}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {s.subjects?.name ?? "שיעור"} · {HEBREW_WEEKDAYS_FULL[s.weekday]} · {s.start_time.slice(0, 5)}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {s.remainingCount} מופעים עתידיים נותרו
                  {s.end_date ? ` · עד ${formatIsoDate(s.end_date)}` : ""}
                </p>
              </div>
              <SeriesActions seriesId={s.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
