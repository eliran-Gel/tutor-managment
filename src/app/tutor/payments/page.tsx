import { createClient } from "@/lib/supabase/server";
import { fetchOverduePayments } from "@/lib/payments";
import { Card } from "@/components/ui/card";
import { MarkPaymentControl } from "@/components/mark-payment-control";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";

export default async function TutorPaymentsPage() {
  const supabase = await createClient();
  const overdue = await fetchOverduePayments(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">תשלומים ממתינים</h1>
        <p className="text-sm text-text-secondary">
          שיעורים מאושרים שעברו ועדיין לא סומנו כשולמו, לפי הסף שהוגדר בהגדרות.
        </p>
      </div>

      {overdue.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">אין תשלומים ממתינים כרגע.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {overdue.map((row) => (
            <Card key={row.participantId} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary">{row.studentName}</p>
                <p className="text-sm text-text-muted">
                  {row.subjectName} · {formatIsoDateWithWeekday(row.date)} · {row.startTime.slice(0, 5)} · ₪{row.price}
                </p>
                {row.cancellationNote && <p className="mt-0.5 text-xs text-status-destructive">{row.cancellationNote}</p>}
              </div>
              <MarkPaymentControl participantId={row.participantId} lessonId={row.lessonId} paymentStatus="unpaid" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
