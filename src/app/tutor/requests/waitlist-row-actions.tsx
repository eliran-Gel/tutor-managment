"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { resolveWaitlistEntry } from "./actions";

export function WaitlistRowActions({ id, date }: { id: string; date: string }) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (confirmingRemove) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => setConfirmingRemove(false)}>
            חזרה
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await resolveWaitlistEntry(id, "cancelled");
                if (result?.error) setError(result.error);
                else setConfirmingRemove(false);
              })
            }
          >
            {isPending ? "מסיר..." : "כן, להסיר"}
          </Button>
        </div>
        {error && <p className="max-w-56 break-words text-xs text-status-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="text-xs" onClick={() => setConfirmingRemove(true)}>
          הסרה
        </Button>
        <Link
          href={`/tutor/calendar/day/${date}`}
          className={buttonClasses("primary", "text-xs")}
          onClick={() =>
            startTransition(async () => {
              await resolveWaitlistEntry(id, "fulfilled");
            })
          }
        >
          יצירת שיעור
        </Link>
      </div>
      {error && <p className="max-w-56 text-xs text-status-destructive">{error}</p>}
    </div>
  );
}
