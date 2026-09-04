import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";
import { RequestRowActions } from "./request-row-actions";
import { ChangeRequestRowActions } from "./change-request-row-actions";
import { WaitlistRowActions } from "./waitlist-row-actions";
import { LeadRowActions } from "./lead-row-actions";

export default async function RequestsPage() {
  const supabase = await createClient();
  const [{ data: leads }, { data: requests }, { data: changeRequests }, { data: waitlist }, { data: students }, { data: subjects }] =
    await Promise.all([
      // Oldest first - a lead from someone who's been waiting longest for a
      // callback should surface at the top, same reasoning as the waitlist.
      supabase.from("marketing_leads").select("*").eq("status", "new").order("created_at"),
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
      // Oldest first = first-come-first-served, so the tutor can see at a
      // glance who to offer an opening to first.
      supabase
        .from("waitlist_entries")
        .select("*, subjects(name), requester:profiles!waitlist_entries_created_by_fkey(full_name, email)")
        .eq("status", "waiting")
        .order("created_at"),
      // Needed for the "יצירת שיעור" quick-create modal on each waitlist row.
      supabase.from("students").select("id, display_name").is("archived_at", null).order("display_name"),
      supabase.from("subjects").select("*").eq("active", true).order("name"),
    ]);

  // Resolves each waitlist entry to a concrete student when it's
  // unambiguous - the entry itself only ever records who *asked*
  // (created_by), not which child, since a parent's entry doesn't
  // distinguish between their kids. A student's own entry always
  // resolves; a parent's only does when they have exactly one child -
  // otherwise the tutor picks from the modal's own student list.
  const waiterIds = Array.from(new Set((waitlist ?? []).map((w) => w.created_by)));
  const [{ data: ownStudentRows }, { data: parentLinkRows }] = await Promise.all([
    waiterIds.length
      ? supabase.from("students").select("id, profile_id").in("profile_id", waiterIds)
      : Promise.resolve({ data: [] }),
    waiterIds.length
      ? supabase.from("parent_students").select("parent_profile_id, student_id").in("parent_profile_id", waiterIds)
      : Promise.resolve({ data: [] }),
  ]);
  const ownStudentByProfile = new Map((ownStudentRows ?? []).map((s) => [s.profile_id, s.id]));
  const childrenByParent = new Map<string, string[]>();
  for (const row of parentLinkRows ?? []) {
    const list = childrenByParent.get(row.parent_profile_id) ?? [];
    list.push(row.student_id);
    childrenByParent.set(row.parent_profile_id, list);
  }
  function resolveWaiterStudentId(createdBy: string): string | undefined {
    const own = ownStudentByProfile.get(createdBy);
    if (own) return own;
    const children = childrenByParent.get(createdBy);
    return children?.length === 1 ? children[0] : undefined;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">בקשות ופניות</h1>
        <p className="text-sm text-text-secondary">כל מה שממתין לתשומת לב שלך, במקום אחד.</p>
      </div>

      <div>
        <h2 className="text-lg font-bold text-text-primary">פניות חדשות מהאתר</h2>
        <p className="text-sm text-text-secondary">אנשים שהשאירו פרטים באתר השיווקי ועדיין לא לקוחות רשומים.</p>
      </div>

      {leads && leads.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">אין פניות חדשות כרגע.</p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {leads?.map((lead) => (
          <Card key={lead.id} className="min-w-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium text-text-primary">{lead.full_name}</p>
              <p className="mt-1 break-words text-sm text-text-secondary">
                <a href={`tel:${lead.phone}`} className="text-brand-accent hover:underline">
                  {lead.phone}
                </a>
                {lead.grade && ` · ${lead.grade}`}
              </p>
              {lead.message && <p className="mt-1 break-words text-sm text-text-muted">{lead.message}</p>}
            </div>
            <LeadRowActions id={lead.id} />
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold text-text-primary">בקשות לשיעורים</h2>
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

      <div>
        <h2 className="text-lg font-bold text-text-primary">רשימת המתנה</h2>
        <p className="text-sm text-text-secondary">
          מסודר לפי מי שביקש/ה ראשון/ה. חסוי מתלמידים - הם רואים רק את הבקשה שלהם.
        </p>
      </div>

      {waitlist && waitlist.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">אין ממתינים כרגע.</p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {waitlist?.map((entry, index) => (
          <Card key={entry.id} className="min-w-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium text-text-primary">
                #{index + 1} · {entry.requester?.full_name ?? entry.requester?.email ?? "משתמש לא ידוע"}
              </p>
              <p className="mt-1 break-words text-sm text-text-secondary">
                {entry.subjects?.name ?? "ללא מקצוע"} · {formatIsoDateWithWeekday(entry.date)}
              </p>
              {entry.note && <p className="mt-1 break-words text-sm text-text-muted">{entry.note}</p>}
            </div>
            <div className="shrink-0">
              <WaitlistRowActions
                id={entry.id}
                date={entry.date}
                subjectId={entry.subject_id ?? undefined}
                studentId={resolveWaiterStudentId(entry.created_by)}
                students={students ?? []}
                subjects={subjects ?? []}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
