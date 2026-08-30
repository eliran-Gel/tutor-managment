import { Card } from "@/components/ui/card";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold font-display text-text-primary">{title}</h1>
      <Card>
        <p className="text-sm text-text-muted">
          {description ?? "התכונה הזו עדיין בפיתוח ותהיה זמינה בקרוב."}
        </p>
      </Card>
    </div>
  );
}
