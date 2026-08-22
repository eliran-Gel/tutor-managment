import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PortalDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">שלום! 👋</h1>
        <p className="text-sm text-text-secondary">כיף לראות אותך שוב</p>
      </div>

      <Card className="bg-brand-primary text-white">
        <p className="text-sm opacity-80">השיעור הבא שלך</p>
        <p className="mt-2 text-lg font-semibold">עדיין אין שיעור מתוזמן</p>
        <Button variant="secondary" className="mt-4 bg-white/10 text-white hover:bg-white/20">
          קביעת שיעור
        </Button>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-text-primary">סיכום השיעור האחרון</p>
          <p className="mt-2 text-sm text-text-muted">אין עדיין סיכומים שפורסמו.</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-text-primary">שיעורי בית</p>
          <p className="mt-2 text-sm text-text-muted">אין משימות פתוחות כרגע.</p>
        </Card>
      </div>
    </div>
  );
}
