import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIsoDate, formatIsoDateWithWeekday } from "@/lib/dates/format";

export default async function TutorHomeworkPage() {
  const supabase = await createClient();
  const { data: homework } = await supabase
    .from("homework")
    .select("id, description, due_date, is_done, students(display_name), lessons(id, date, subjects(name))")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">שיעורי בית</h1>
        <p className="text-sm text-text-secondary">כל שיעורי הבית שהוקצו, מהחדש לישן.</p>
      </div>

      {homework && homework.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">עדיין לא הוקצו שיעורי בית.</p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {homework?.map((hw) => (
          <Card key={hw.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-text-primary">{hw.students?.display_name ?? "תלמיד/ה"}</p>
              <p className="mt-1 break-words text-sm text-text-secondary">{hw.description}</p>
              <p className="mt-1 text-xs text-text-muted">
                {hw.lessons && `${hw.lessons.subjects?.name ?? "שיעור"} · ${formatIsoDateWithWeekday(hw.lessons.date)}`}
                {hw.due_date && ` · עד ${formatIsoDate(hw.due_date)}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={hw.is_done ? "confirmed" : "pending"}>{hw.is_done ? "בוצע" : "לא בוצע"}</Badge>
              {hw.lessons && (
                <Link
                  href={`/tutor/lessons/${hw.lessons.id}`}
                  className="text-sm font-medium text-brand-accent hover:underline"
                >
                  לשיעור ←
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
