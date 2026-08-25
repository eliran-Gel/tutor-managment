"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { TimeSlotSelect } from "@/components/ui/time-slot-select";
import { generateTimeSlots } from "@/lib/time-slots";
import { createAvailabilityBlock } from "./actions";

// The lesson-booking grid only spans 07:00-22:45; a blocked period can
// reasonably start or end outside working hours, so this covers the full day.
const FULL_DAY_SLOTS = generateTimeSlots(0, 24);

export function AddBlockModal() {
  const [open, setOpen] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        חסימת זמן
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="חסימת זמן חדשה">
        <form
          ref={formRef}
          className="flex flex-col gap-4"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                await createAvailabilityBlock(formData);
                formRef.current?.reset();
                setAllDay(false);
                setStartTime("");
                setEndTime("");
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "שגיאה לא צפויה");
              }
            });
          }}
        >
          <Field label="תאריך" htmlFor="date">
            <TextInput id="date" name="date" type="date" required />
          </Field>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              name="all_day"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            חסימת יום שלם (ללא תלות בשעות)
          </label>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="משעה" htmlFor="start_time">
                <TimeSlotSelect
                  id="start_time"
                  name="start_time"
                  value={startTime}
                  onChange={setStartTime}
                  required={!allDay}
                  slots={FULL_DAY_SLOTS}
                />
              </Field>
              <Field label="עד שעה" htmlFor="end_time">
                <TimeSlotSelect
                  id="end_time"
                  name="end_time"
                  value={endTime}
                  onChange={setEndTime}
                  required={!allDay}
                  slots={FULL_DAY_SLOTS}
                />
              </Field>
            </div>
          )}

          <Field label="חזרתיות" htmlFor="recurrence">
            <select
              id="recurrence"
              name="recurrence"
              defaultValue="none"
              className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="none">חד פעמי</option>
              <option value="weekly">כל שבוע</option>
            </select>
          </Field>
          <Field label="הערה (אופציונלי)" htmlFor="note">
            <TextInput id="note" name="note" placeholder="למשל: תור רופא" />
          </Field>

          {error && <p className="text-sm text-status-destructive">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "שומר..." : "חסימה"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
