import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { fetchLessonHistory } from "@/lib/lesson-history";
import { HistoryList } from "./history-list";

export default async function StudentHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("id, display_name").eq("id", id).single();
  if (!student) notFound();

  const rows = await fetchLessonHistory(supabase, id);

  const paidTotal = rows.filter((r) => r.payment_status === "paid").reduce((sum, r) => sum + r.price_charged, 0);
  const unpaidTotal = rows.filter((r) => r.payment_status === "unpaid").reduce((sum, r) => sum + r.price_charged, 0);
  const cancelledCount = rows.filter((r) => r.lessons.status === "cancelled").length;

  const subjectCounts = new Map<string, number>();
  for (const row of rows) {
    const name = row.lessons.subjects?.name ?? "ללא מקצוע";
    subjectCounts.set(name, (subjectCounts.get(name) ?? 0) + 1);
  }

  const stats = [
    { label: "סה\"כ שיעורים", value: String(rows.length) },
    { label: "שולם", value: `₪${paidTotal}` },
    { label: "לא שולם", value: `₪${unpaidTotal}` },
    { label: "בוטלו", value: String(cancelledCount) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/tutor/students/${id}`}
          className="inline-block text-sm font-medium text-text-secondary transition-transform duration-200 hover:text-text-primary active:scale-95"
        >
          ‹ חזרה לעמוד התלמיד/ה
        </Link>
        <h1 className="mt-1 min-w-0 break-words text-xl font-bold font-display text-text-primary">
          היסטוריה מלאה · {student.display_name}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-xs text-text-secondary">{stat.label}</p>
            <p className="mt-1 text-xl font-bold font-display text-text-primary">{stat.value}</p>
          </Card>
        ))}
      </div>

      {subjectCounts.size > 0 && (
        <Card>
          <p className="mb-2 text-xs font-medium text-text-secondary">התפלגות לפי מקצוע</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(subjectCounts.entries()).map(([name, count]) => (
              <span
                key={name}
                className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-text-secondary"
              >
                {name}: {count}
              </span>
            ))}
          </div>
        </Card>
      )}

      <HistoryList rows={rows} studentId={id} />
    </div>
  );
}
