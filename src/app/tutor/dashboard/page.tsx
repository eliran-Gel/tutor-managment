import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDate } from "@/lib/dates/format";

export default async function TutorDashboardPage() {
  const supabase = await createClient();

  const [{ count: activeStudents }, { data: pendingRequests }] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase
      .from("lessons")
      .select("*, subjects(name), requester:profiles!lessons_created_by_fkey(full_name, email)")
      .eq("status", "requested")
      .order("created_at")
      .limit(5),
  ]);

  const kpis = [
    { label: "תלמידים פעילים", value: activeStudents ?? "—" },
    { label: "היום", value: "—" },
    { label: "השבוע", value: "—" },
    { label: "החודש", value: "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">בוקר טוב, אלירן!</h1>
        <p className="text-sm text-text-secondary">
          נתוני הכנסות/שעות יתווספו בשלבי הפיתוח הבאים.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-sm text-text-secondary">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>בקשות לשיעורים ממתינות</CardTitle>
            <Badge tone="pending">{pendingRequests?.length ?? 0}</Badge>
          </CardHeader>
          {pendingRequests && pendingRequests.length === 0 ? (
            <p className="text-sm text-text-muted">אין בקשות ממתינות כרגע.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendingRequests?.map((req) => (
                <li key={req.id} className="min-w-0 rounded-control border border-border px-3 py-2 text-sm">
                  <p className="break-words font-medium text-text-primary">
                    {req.requester?.full_name ?? req.requester?.email}
                  </p>
                  <p className="break-words text-text-muted">
                    {req.subjects?.name} · {formatIsoDate(req.date)} · {req.start_time.slice(0, 5)} ·{" "}
                    {DELIVERY_MODE_LABELS[req.delivery_mode]}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/tutor/requests" className="mt-3 inline-block text-sm font-medium text-brand-accent transition-transform duration-200 hover:underline active:scale-90">
            לכל הבקשות ←
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>תשלומים ממתינים</CardTitle>
            <Badge tone="pending">0</Badge>
          </CardHeader>
          <p className="text-sm text-text-muted">אין תשלומים ממתינים כרגע.</p>
        </Card>
      </div>
    </div>
  );
}
