import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIsoDate } from "@/lib/dates/format";
import { UrlSearchBox } from "@/components/ui/search-box";
import { containsPattern, parseSearchQuery } from "@/lib/search";

function toneFor(score: number, maxScore: number): "confirmed" | "pending" | "destructive" {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return "confirmed";
  if (pct >= 60) return "pending";
  return "destructive";
}

export default async function TutorGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const search = parseSearchQuery((await searchParams).q);
  const supabase = await createClient();
  let query = supabase
    .from("grades")
    .select("id, title, score, max_score, exam_date, note, students!inner(id, display_name), subjects(name)")
    .order("exam_date", { ascending: false })
    .limit(100);
  if (search) query = query.ilike("students.display_name", containsPattern(search));
  const { data: grades } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">ציונים והתקדמות</h1>
        <p className="text-sm text-text-secondary">כל הציונים שנרשמו, מהחדש לישן.</p>
      </div>

      <UrlSearchBox initialValue={search} placeholder="חיפוש לפי שם תלמיד/ה" />

      {grades && grades.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">
            {search
              ? `לא נמצאו ציונים לתלמיד/ה בשם "${search}".`
              : "עדיין לא נרשמו ציונים. אפשר להוסיף מתוך עמוד התלמיד/ה."}
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {grades?.map((g) => (
          <Card key={g.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-text-primary">{g.title}</p>
              <p className="mt-1 text-sm text-text-secondary">
                {g.students?.display_name ?? "תלמיד/ה"}
                {g.subjects?.name && ` · ${g.subjects.name}`}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {formatIsoDate(g.exam_date)}
                {g.note && ` · ${g.note}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={toneFor(g.score, g.max_score)}>
                {g.score}/{g.max_score}
              </Badge>
              {g.students && (
                <Link
                  href={`/tutor/students/${g.students.id}`}
                  className="text-sm font-medium text-brand-accent hover:underline"
                >
                  לתלמיד/ה ←
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
