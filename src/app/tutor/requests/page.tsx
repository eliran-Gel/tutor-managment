import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";
import { RequestRowActions } from "./request-row-actions";
import { ChangeRequestRowActions } from "./change-request-row-actions";

export default async function RequestsPage() {
  const supabase = await createClient();
  const [{ data: requests }, { data: changeRequests }] = await Promise.all([
    supabase
      .from("lessons")
      .select("*, subjects(name), requester:profiles!lessons_created_by_fkey(full_name, email)")
      .eq("status", "requested")
      .order("created_at"),
    supabase
      .from("change_requests")
      .select(
        "*, requester:profiles!change_requests_requested_by_fkey(full_name, email), lessons(date, start_time, end_time, subjects(name)), requested_subject:subjects!change_requests_requested_subject_id_fkey(name)",
      )
      .eq("status", "pending")
      .order("created_at"),
  ]);

  return (
    <div className="flex flex-col gap-8">
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
                {req.subjects?.name ?? "ללא מקצוע"} · {formatIsoDateWithWeekday(req.date)} ·{" "}
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

      <div>
        <h2 className="text-lg font-bold text-text-primary">בקשות דחייה וביטול</h2>
        <p className="text-sm text-text-secondary">
          השיעור המקורי נשאר ללא שינוי עד שתאשר או תדחה את הבקשה.
        </p>
      </div>

      {changeRequests && changeRequests.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">אין בקשות שינוי ממתינות כרגע.</p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {changeRequests?.map((cr) => (
          <Card key={cr.id} className="min-w-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium text-text-primary">
                {cr.requester?.full_name ?? cr.requester?.email ?? "משתמש לא ידוע"} ·{" "}
                {cr.request_type === "cancel" ? "בקשת ביטול" : "בקשת דחייה"}
              </p>
              <p className="mt-1 break-words text-sm text-text-secondary">
                שיעור נוכחי: {cr.lessons?.subjects?.name ?? "ללא מקצוע"} ·{" "}
                {cr.lessons && formatIsoDateWithWeekday(cr.lessons.date)} ·{" "}
                {cr.lessons?.start_time.slice(0, 5)}–{cr.lessons?.end_time.slice(0, 5)}
              </p>
              {cr.request_type === "reschedule" && cr.requested_date && (
                <p className="mt-1 break-words text-sm font-medium text-status-selected">
                  לתאריך חדש: {formatIsoDateWithWeekday(cr.requested_date)} ·{" "}
                  {cr.requested_start_time?.slice(0, 5)}–{cr.requested_end_time?.slice(0, 5)}
                </p>
              )}
              {cr.requested_subject && (
                <p className="mt-1 break-words text-sm font-medium text-status-selected">
                  מקצוע חדש: {cr.requested_subject.name}
                </p>
              )}
              {cr.reason && <p className="mt-1 break-words text-sm text-text-muted">{cr.reason}</p>}
            </div>
            <div className="shrink-0">
              <ChangeRequestRowActions requestId={cr.id} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
