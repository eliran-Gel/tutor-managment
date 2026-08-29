"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";
import { leaveWaitlist } from "@/app/portal/waitlist/actions";

type WaitlistRow = {
  id: string;
  date: string;
  note: string | null;
  subjects: { name: string } | null;
};

export function MyWaitlistSection({ entries }: { entries: WaitlistRow[] }) {
  const [isPending, startTransition] = useTransition();

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-text-primary">רשימת ההמתנה שלי</h2>
      {entries.map((entry) => (
        <Card key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-text-primary">
              {entry.subjects?.name ?? "שיעור"} · {formatIsoDateWithWeekday(entry.date)}
            </p>
            {entry.note && <p className="mt-0.5 text-sm text-text-muted">{entry.note}</p>}
            <Badge tone="pending" className="mt-1">
              ממתין/ה
            </Badge>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            disabled={isPending}
            onClick={() => startTransition(async () => { await leaveWaitlist(entry.id); })}
          >
            עזיבת הרשימה
          </Button>
        </Card>
      ))}
    </div>
  );
}
