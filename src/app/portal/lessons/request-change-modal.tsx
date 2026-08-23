"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { TimeSlotSelect } from "@/components/ui/time-slot-select";
import { formatIsoDate } from "@/lib/dates/format";
import { requestLessonChange } from "./actions";
import type { Tables } from "@/types/database";

export function RequestChangeModal({
  lessonId,
  currentDate,
  currentStartTime,
  subjects,
}: {
  lessonId: string;
  currentDate: string;
  currentStartTime: string;
  subjects: Tables<"subjects">[];
}) {
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState<"reschedule" | "cancel">("reschedule");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 1);
  const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

  function reset() {
    setRequestType("reschedule");
    setDate("");
    setStartTime("");
    setSubjectId("");
    setReason("");
    setError(null);
    setSuccess(false);
  }

  function submit() {
    setError(null);
    if (requestType === "reschedule" && (!date || !startTime)) {
      setError("יש לבחור תאריך ושעה חדשים");
      return;
    }

    const formData = new FormData();
    formData.set("lesson_id", lessonId);
    formData.set("request_type", requestType);
    if (requestType === "reschedule") {
      formData.set("requested_date", date);
      formData.set("requested_start_time", startTime);
      if (subjectId) formData.set("requested_subject_id", subjectId);
    }
    if (reason) formData.set("reason", reason);

    startTransition(async () => {
      const result = await requestLessonChange(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          reset();
        }, 1200);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="text-xs"
        onClick={() => setOpen(true)}
      >
        בקשת שינוי
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="בקשת שינוי לשיעור">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            השיעור הנוכחי: {formatIsoDate(currentDate)} · {currentStartTime.slice(0, 5)}. השיעור יישאר כפי
            שהוא עד שהמורה יאשר את הבקשה.
          </p>

          <Field label="סוג בקשה" htmlFor="request_type">
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={requestType === "reschedule"}
                  onChange={() => setRequestType("reschedule")}
                />
                דחיית שיעור
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={requestType === "cancel"}
                  onChange={() => setRequestType("cancel")}
                />
                ביטול שיעור
              </label>
            </div>
          </Field>

          {requestType === "reschedule" && (
            <>
              <Field label="תאריך חדש" htmlFor="rc-date">
                <TextInput
                  id="rc-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={toDateInput(today)}
                  max={toDateInput(maxDate)}
                  required
                />
              </Field>
              <Field label="שעה חדשה" htmlFor="rc-time">
                <TimeSlotSelect id="rc-time" value={startTime} onChange={setStartTime} required />
              </Field>
              <Field label="מקצוע חדש (אופציונלי)" htmlFor="rc-subject">
                <select
                  id="rc-subject"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  <option value="">ללא שינוי</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <Field label="הערה (אופציונלי)" htmlFor="rc-reason">
            <TextInput id="rc-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>

          {error && <p className="text-sm text-status-destructive">{error}</p>}
          {success && <p className="text-sm text-status-confirmed">הבקשה נשלחה! ממתינה לאישור המורה.</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="button" disabled={isPending} onClick={submit}>
              {isPending ? "שולח..." : "שליחת בקשה"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
