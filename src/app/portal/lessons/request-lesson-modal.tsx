"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { TimeSlotSelect } from "@/components/ui/time-slot-select";
import { LESSON_DURATIONS } from "@/lib/lessons";
import { calculateLessonPrice } from "@/lib/pricing";
import { requestLesson, getAvailableStartTimesAction } from "./actions";
import type { Tables } from "@/types/database";

export function RequestLessonModal({
  subjects,
  triggerClassName,
}: {
  subjects: Tables<"subjects">[];
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [availableSlots, setAvailableSlots] = useState<string[] | undefined>(undefined);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 1);
  const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

  // Fetches available start times from the server whenever the date or
  // duration changes - a genuine external-data sync, not derived state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setSlotsLoading(true);
    getAvailableStartTimesAction(date, duration).then((slots) => {
      if (cancelled) return;
      setAvailableSlots(slots);
      setSlotsLoading(false);
      setStartTime((prev) => (slots.includes(prev) ? prev : ""));
    });
    return () => {
      cancelled = true;
    };
  }, [date, duration]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        קביעת שיעור
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="בקשת שיעור חדש">
        {subjects.length === 0 ? (
          <p className="text-sm text-text-muted">
            עדיין לא הוגדרו מקצועות במערכת. יש לפנות למורה.
          </p>
        ) : (
          <form
            ref={formRef}
            className="flex flex-col gap-4"
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const result = await requestLesson(formData);
                if (result?.error) {
                  setError(result.error);
                } else {
                  setSuccess(true);
                  formRef.current?.reset();
                  setDate("");
                  setStartTime("");
                  setAvailableSlots(undefined);
                  setTimeout(() => {
                    setOpen(false);
                    setSuccess(false);
                  }, 1200);
                }
              });
            }}
          >
            <Field label="מקצוע" htmlFor="subject_id">
              <select
                id="subject_id"
                name="subject_id"
                required
                className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="תאריך" htmlFor="date">
              <TextInput
                id="date"
                name="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={toDateInput(today)}
                max={toDateInput(maxDate)}
              />
            </Field>

            <Field label="משך השיעור" htmlFor="duration_minutes">
              <select
                id="duration_minutes"
                name="duration_minutes"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
              >
                {LESSON_DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} דקות
                  </option>
                ))}
              </select>
            </Field>

            <Field label="שעת התחלה" htmlFor="start_time">
              <TimeSlotSelect
                id="start_time"
                name="start_time"
                value={startTime}
                onChange={setStartTime}
                required
                slots={date ? availableSlots : []}
                loading={slotsLoading}
                emptyMessage={date ? "כל השעות תפוסות ביום זה" : "יש לבחור תאריך קודם"}
              />
            </Field>

            <p className="text-sm text-text-secondary">
              מחיר: <span className="font-semibold text-text-primary">₪{calculateLessonPrice("individual", duration)}</span>
            </p>

            <Field label="אופן השיעור" htmlFor="delivery_mode">
              <select
                id="delivery_mode"
                name="delivery_mode"
                defaultValue="in_person"
                className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
              >
                <option value="in_person">פרונטלי</option>
                <option value="online">מקוון</option>
              </select>
            </Field>

            <Field label="נושא (אופציונלי)" htmlFor="topic">
              <TextInput id="topic" name="topic" placeholder="למשל: הכנה למבחן" />
            </Field>

            {error && <p className="text-sm text-status-destructive">{error}</p>}
            {success && (
              <p className="text-sm text-status-confirmed">הבקשה נשלחה! ממתינה לאישור המורה.</p>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "שולח..." : "שליחת בקשה"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
