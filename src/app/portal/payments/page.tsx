import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getSelectedChild } from "@/lib/portal/get-selected-child";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_METHOD_LABELS } from "@/lib/lessons";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";

export default async function PortalPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { child: requestedChild } = await searchParams;
  const { current } = await getSelectedChild(supabase, profile, requestedChild);

  // Explicit student_id filter now, instead of relying on RLS alone to
  // scope this - RLS still allows a parent to read every one of their
  // children's rows, so without this a parent with more than one child
  // would keep seeing everyone's payments blended together regardless of
  // which child is selected elsewhere in the portal.
  const { data: rows } = current
    ? await supabase
        .from("lesson_participants")
        .select(
          "id, price_charged, payment_status, payment_method, cancellation_note, students(display_name), lessons(date, start_time, subjects(name))",
        )
        .eq("student_id", current.id)
        .order("date", { referencedTable: "lessons", ascending: false })
    : { data: [] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">תשלומים</h1>
        <p className="text-sm text-text-secondary">
          {profile?.role === "parent" && current
            ? `סטטוס התשלום של השיעורים של ${current.display_name}.`
            : "סטטוס התשלום של השיעורים שלך."}
        </p>
      </div>

      {!rows || rows.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">אין עדיין שיעורים.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card key={row.id} className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-text-primary">
                  {row.lessons?.subjects?.name ?? "שיעור"}
                  {row.students && ` · ${row.students.display_name}`}
                </p>
                <p className="text-sm text-text-muted">
                  {row.lessons && `${formatIsoDateWithWeekday(row.lessons.date)} · ${row.lessons.start_time.slice(0, 5)} · `}
                  ₪{row.price_charged}
                </p>
                {row.cancellation_note && <p className="mt-0.5 text-xs text-text-muted">{row.cancellation_note}</p>}
              </div>
              <Badge tone={row.payment_status === "paid" ? "confirmed" : "pending"}>
                {row.payment_status === "paid"
                  ? `שולם${row.payment_method ? ` · ${PAYMENT_METHOD_LABELS[row.payment_method]}` : ""}`
                  : "לא שולם"}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
