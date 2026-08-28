import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_METHOD_LABELS } from "@/lib/lessons";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";

export default async function PortalPaymentsPage() {
  const supabase = await createClient();
  // No explicit student filter - RLS (lesson_participants_select_own /
  // _select_parent) already scopes this to the caller's own lessons (or,
  // for a parent, all of their children's). No running-balance/aggregate
  // is ever computed here, per the "no debt dashboard" product decision -
  // only per-lesson status.
  const { data: rows } = await supabase
    .from("lesson_participants")
    .select("id, price_charged, payment_status, payment_method, students(display_name), lessons(date, start_time, subjects(name))")
    .order("date", { referencedTable: "lessons", ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">תשלומים</h1>
        <p className="text-sm text-text-secondary">סטטוס התשלום של השיעורים שלך.</p>
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
