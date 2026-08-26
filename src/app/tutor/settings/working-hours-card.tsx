"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TimeSlotSelect } from "@/components/ui/time-slot-select";
import { generateTimeSlots } from "@/lib/time-slots";
import { HEBREW_WEEKDAYS_FULL } from "@/lib/dates/format";
import { updateWorkingHours } from "./actions";
import type { Tables } from "@/types/database";

// A working-hours window can reasonably start/end outside the 07:00-22:45
// lesson-booking grid, so this covers the full day.
const FULL_DAY_SLOTS = generateTimeSlots(0, 24);

type Row = { day_of_week: number; is_open: boolean; start_time: string | null; end_time: string | null };

function toRows(workingHours: Tables<"tutor_working_hours">[]): Row[] {
  return Array.from({ length: 7 }, (_, day) => {
    const existing = workingHours.find((w) => w.day_of_week === day);
    return {
      day_of_week: day,
      is_open: existing?.is_open ?? false,
      start_time: existing?.start_time?.slice(0, 5) ?? null,
      end_time: existing?.end_time?.slice(0, 5) ?? null,
    };
  });
}

export function WorkingHoursCard({ workingHours }: { workingHours: Tables<"tutor_working_hours">[] }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(workingHours));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateRow(day: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateWorkingHours(rows);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "שגיאה לא צפויה");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>שעות פעילות ברירת מחדל</CardTitle>
      </CardHeader>
      <p className="mb-4 text-xs text-text-muted">
        אלה השעות שבהן תלמידים יוכלו לבקש שיעורים. חסימות זמן חד-פעמיות (חופשה, תור) נשארות נפרדות
        בעמוד &quot;חסימת שעות&quot;.
      </p>

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.day_of_week} className="flex flex-wrap items-center gap-3">
            <label className="flex w-24 shrink-0 items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={row.is_open}
                onChange={(e) => updateRow(row.day_of_week, { is_open: e.target.checked })}
              />
              {HEBREW_WEEKDAYS_FULL[row.day_of_week]}
            </label>

            {row.is_open ? (
              <div className="flex flex-wrap items-center gap-2">
                <TimeSlotSelect
                  value={row.start_time ?? ""}
                  onChange={(v) => updateRow(row.day_of_week, { start_time: v })}
                  slots={FULL_DAY_SLOTS}
                  required
                />
                <span className="text-sm text-text-muted">עד</span>
                <TimeSlotSelect
                  value={row.end_time ?? ""}
                  onChange={(v) => updateRow(row.day_of_week, { end_time: v })}
                  slots={FULL_DAY_SLOTS}
                  required
                />
              </div>
            ) : (
              <span className="text-sm text-text-muted">סגור</span>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-status-destructive">{error}</p>}
      {saved && !error && <p className="mt-3 text-sm text-status-confirmed">נשמר בהצלחה.</p>}

      <div className="mt-4 flex justify-end">
        <Button type="button" disabled={isPending} onClick={save}>
          {isPending ? "שומר..." : "שמירה"}
        </Button>
      </div>
    </Card>
  );
}
