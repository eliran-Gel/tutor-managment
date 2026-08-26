import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatIsoDate, formatIsoDateWithWeekday } from "@/lib/dates/format";
import { HomeworkList } from "./homework-list";

export default async function PortalHomeworkPage() {
  const supabase = await createClient();
  const { data: homework } = await supabase
    .from("homework")
    .select("id, description, due_date, is_done, lessons(date, subjects(name))")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">שיעורי בית</h1>
        <p className="text-sm text-text-secondary">כל שיעורי הבית שהוקצו לך.</p>
      </div>

      {homework && homework.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">אין כרגע שיעורי בית.</p>
        </Card>
      )}

      <HomeworkList
        homework={(homework ?? []).map((hw) => ({
          id: hw.id,
          description: hw.description,
          is_done: hw.is_done,
          due_date_label: hw.due_date ? formatIsoDate(hw.due_date) : null,
          lesson_label: hw.lessons ? `${hw.lessons.subjects?.name ?? "שיעור"} · ${formatIsoDateWithWeekday(hw.lessons.date)}` : null,
        }))}
      />
    </div>
  );
}
