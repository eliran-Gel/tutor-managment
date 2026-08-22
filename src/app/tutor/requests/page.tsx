import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDate } from "@/lib/dates/format";
import { RequestRowActions } from "./request-row-actions";

export default async function RequestsPage() {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("lessons")
    .select("*, subjects(name), requester:profiles!lessons_created_by_fkey(full_name, email)")
    .eq("status", "requested")
    .order("created_at");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">בקשות לשיעורים</h1>
        <p className="text-sm text-text-secondary">אישור בקשה יוצר שיעור מאושר ביומן.</p>
      </div>

      {requests && requests.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">אין בקשות ממתינות כרגע.</p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {requests?.map((req) => (
          <Card key={req.id} className="min-w-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium text-text-primary">
                {req.requester?.full_name ?? req.requester?.email ?? "משתמש לא ידוע"}
              </p>
              <p className="mt-1 break-words text-sm text-text-secondary">
                {req.subjects?.name ?? "ללא מקצוע"} · {formatIsoDate(req.date)} ·{" "}
                {req.start_time.slice(0, 5)}–{req.end_time.slice(0, 5)} ·{" "}
                {DELIVERY_MODE_LABELS[req.delivery_mode]}
              </p>
              {req.topic && <p className="mt-1 break-words text-sm text-text-muted">{req.topic}</p>}
            </div>
            <div className="shrink-0">
              <RequestRowActions lessonId={req.id} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
