import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIsoDate } from "@/lib/dates/format";

function toneFor(score: number, maxScore: number): "confirmed" | "pending" | "destructive" {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return "confirmed";
  if (pct >= 60) return "pending";
  return "destructive";
}

export default async function PortalGradesPage() {
  const supabase = await createClient();
  const { data: grades } = await supabase
    .from("grades")
    .select("id, title, score, max_score, exam_date, note, subjects(name)")
    .order("exam_date", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">ציונים</h1>
        <p className="text-sm text-text-secondary">כל הציונים שנרשמו לך, מהחדש לישן.</p>
      </div>

      {grades && grades.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">עדיין אין ציונים רשומים.</p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {grades?.map((g) => (
          <Card key={g.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-text-primary">{g.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{g.subjects?.name}</p>
              <p className="mt-1 text-xs text-text-muted">
                {formatIsoDate(g.exam_date)}
                {g.note && ` · ${g.note}`}
              </p>
            </div>
            <Badge tone={toneFor(g.score, g.max_score)}>
              {g.score}/{g.max_score}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
