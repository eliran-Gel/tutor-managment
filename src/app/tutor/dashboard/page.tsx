import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const kpis = [
  { label: "תלמידים פעילים", value: "—" },
  { label: "היום", value: "—" },
  { label: "השבוע", value: "—" },
  { label: "החודש", value: "—" },
];

export default function TutorDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">בוקר טוב, אלירן!</h1>
        <p className="text-sm text-text-secondary">
          לוח הבקרה עדיין ריק — הנתונים החיים יתווספו בשלבי הפיתוח הבאים.
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
            <Badge tone="pending">0</Badge>
          </CardHeader>
          <p className="text-sm text-text-muted">אין בקשות עדיין — תתווספנה בשלב הבא.</p>
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
