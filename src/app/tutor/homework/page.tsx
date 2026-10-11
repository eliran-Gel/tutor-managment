import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIsoDate, formatIsoDateWithWeekday } from "@/lib/dates/format";
import { UrlSearchBox } from "@/components/ui/search-box";
import { containsPattern, parseSearchQuery } from "@/lib/search";

export default async function TutorHomeworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const search = parseSearchQuery((await searchParams).q);
  const supabase = await createClient();
  // !inner so the student-name filter below removes whole rows instead of
  // just blanking the embedded student - and it's applied in the query (not
  // on the fetched rows) so an older match isn't lost to the 100-row cap.
  let query = supabase
    .from("homework")
    .select("id, description, due_date, is_done, students!inner(display_name), lessons(id, date, subjects(name))")
    .order("created_at", { ascending: false })
    .limit(100);
  if (search) query = query.ilike("students.display_name", containsPattern(search));
  const { data: homework } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">שיעורי בית</h1>
        <p className="text-sm text-text-secondary">כל שיעורי הבית שהוקצו, מהחדש לישן.</p>
      </div>

      <UrlSearchBox initialValue={search} placeholder="חיפוש לפי שם תלמיד/ה" />

      {homework && homework.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">
            {search ? `לא נמצאו שיעורי בית לתלמיד/ה בשם "${search}".` : "עדיין לא הוקצו שיעורי בית."}
          </p>
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
