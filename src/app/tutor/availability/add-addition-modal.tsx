"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { TimeSlotSelect } from "@/components/ui/time-slot-select";
import { generateTimeSlots } from "@/lib/time-slots";
import { createAvailabilityAddition } from "./actions";

const FULL_DAY_SLOTS = generateTimeSlots(0, 24);

export function AddAdditionModal() {
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        הוספת שעות
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="הוספת שעות חד-פעמית">
        <form
          ref={formRef}
          className="flex flex-col gap-4"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                await createAvailabilityAddition(formData);
                formRef.current?.reset();
                setStartTime("");
                setEndTime("");
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "שגיאה לא צפויה");
              }
            });
          }}
        >
          <p className="text-sm text-text-secondary">
            קובע שעות מיוחדות לתאריך ספציפי אחד בלבד - במקום השעות הרגילות באותו יום. בשבוע שאחריו
            חוזר אוטומטית לברירת המחדל.
          </p>

          <Field label="תאריך" htmlFor="addition_date">
            <TextInput id="addition_date" name="date" type="date" required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="משעה" htmlFor="addition_start_time">
              <TimeSlotSelect
                id="addition_start_time"
                name="start_time"
                value={startTime}
                onChange={setStartTime}
                required
                slots={FULL_DAY_SLOTS}
              />
            </Field>
            <Field label="עד שעה" htmlFor="addition_end_time">
              <TimeSlotSelect
                id="addition_end_time"
                name="end_time"
                value={endTime}
                onChange={setEndTime}
                required
                slots={FULL_DAY_SLOTS}
              />
            </Field>
          </div>

          <Field label="הערה (אופציונלי)" htmlFor="addition_note">
            <TextInput id="addition_note" name="note" placeholder="למשל: בקשה מיוחדת של תלמיד" />
          </Field>

          {error && <p className="text-sm text-status-destructive">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "שומר..." : "הוספה"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
