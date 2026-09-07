"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { DateField } from "@/components/ui/date-field";
import { Button } from "@/components/ui/button";
import { TimeSlotSelect } from "@/components/ui/time-slot-select";
import { LESSON_DURATIONS } from "@/lib/lessons";
import { rescheduleLesson } from "@/app/tutor/lessons/actions";

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

/** Closest duration option to the lesson's current length - a lesson
 * created before LESSON_DURATIONS existed or with an unusual length
 * shouldn't leave the select on an invalid/blank value. */
function closestDuration(minutes: number) {
  return LESSON_DURATIONS.reduce((closest, d) =>
    Math.abs(d - minutes) < Math.abs(closest - minutes) ? d : closest,
  );
}

export function RescheduleLessonCard({
  lessonId,
  initialDate,
  initialStartTime,
  initialEndTime,
}: {
  lessonId: string;
  initialDate: string;
  initialStartTime: string;
  initialEndTime: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime.slice(0, 5));
  const [duration, setDuration] = useState<number>(
    closestDuration(minutesBetween(initialStartTime, initialEndTime)),
  );
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(forced: boolean) {
    setError(null);
    setConflict(null);
    setSaved(false);
    startTransition(async () => {
      const result = await rescheduleLesson(lessonId, {
        date,
        start_time: startTime,
        duration_minutes: duration,
        forced,
      });
      if (result?.conflict) {
        setConflict(result.message);
      } else if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>שינוי מועד השיעור</CardTitle>
      </CardHeader>

      <div className="flex flex-col gap-4">
        <Field label="תאריך" htmlFor="reschedule-date">
          <DateField
            id="reschedule-date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setConflict(null);
            }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="שעת התחלה" htmlFor="reschedule-start">
            <TimeSlotSelect
              id="reschedule-start"
              value={startTime}
              onChange={(v) => {
                setStartTime(v);
                setConflict(null);
              }}
            />
          </Field>
          <Field label="משך" htmlFor="reschedule-duration">
            <select
              id="reschedule-duration"
              value={duration}
              onChange={(e) => {
                setDuration(Number(e.target.value));
                setConflict(null);
              }}
              className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              {LESSON_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} דקות
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && <p className="text-sm text-status-destructive">{error}</p>}
        {saved && !error && !conflict && <p className="text-sm text-status-confirmed">המועד עודכן בהצלחה.</p>}

        {conflict ? (
          <div className="rounded-control border-2 border-status-pending bg-status-pending-bg px-4 py-3 text-sm">
            <p className="font-semibold text-status-pending">⚠ {conflict}</p>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={isPending} onClick={() => setConflict(null)}>
                ביטול
              </Button>
              <Button type="button" variant="destructive" disabled={isPending} onClick={() => submit(true)}>
                {isPending ? "משנה..." : "כן, לשנות בכל זאת"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button type="button" disabled={isPending} onClick={() => submit(false)}>
              {isPending ? "שומר..." : "עדכון מועד"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
