"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { TimeSlotSelect } from "@/components/ui/time-slot-select";
import { LESSON_DURATIONS } from "@/lib/lessons";
import { calculateLessonPrice } from "@/lib/pricing";
import { requestLesson, editLessonRequest, getAvailableStartTimesAction } from "./actions";
import { joinWaitlist } from "@/app/portal/waitlist/actions";
import type { Tables } from "@/types/database";

export type EditableLesson = {
  id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  subject_id: string;
  delivery_mode: "online" | "in_person";
  topic: string | null;
};

export function RequestLessonModal({
  subjects,
  studentId,
  triggerClassName,
  triggerLabel = "קביעת שיעור",
  triggerVariant = "primary",
  editingLesson,
}: {
  subjects: Tables<"subjects">[];
  /** Whose behalf the request is for - the caller's own student row for a
   * student, or the portal's currently-selected child for a parent. Not
   * needed when editing (the target student was already fixed when the
   * original request was created and can't change). */
  studentId?: string;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary";
  /** When set, the modal edits this still-pending request instead of
   * creating a new one - prefills every field from it. */
  editingLesson?: EditableLesson;
}) {
  const isEditing = Boolean(editingLesson);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(editingLesson?.date ?? "");
  const [startTime, setStartTime] = useState(editingLesson ? editingLesson.start_time.slice(0, 5) : "");
  const [duration, setDuration] = useState(editingLesson?.duration_minutes ?? 60);
  const [subjectId, setSubjectId] = useState(editingLesson?.subject_id ?? subjects[0]?.id ?? "");
  const [availableSlots, setAvailableSlots] = useState<string[] | undefined>(undefined);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistNote, setWaitlistNote] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
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
    getAvailableStartTimesAction(date, duration, editingLesson?.id).then((slots) => {
      if (cancelled) return;
      setAvailableSlots(slots);
      setSlotsLoading(false);
      setStartTime((prev) => (slots.includes(prev) ? prev : ""));
    });
    return () => {
      cancelled = true;
    };
  }, [date, duration, editingLesson?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isFullyBooked = Boolean(date) && !slotsLoading && availableSlots !== undefined && availableSlots.length === 0;

  function resetAndClose() {
    formRef.current?.reset();
    setShowWaitlistForm(false);
    setWaitlistNote("");
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant={triggerVariant} onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={isEditing ? "עריכת בקשה" : "בקשת שיעור חדש"}>
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
              if (isEditing) formData.set("lesson_id", editingLesson!.id);
              else if (studentId) formData.set("student_id", studentId);
              startTransition(async () => {
                const result = isEditing ? await editLessonRequest(formData) : await requestLesson(formData);
                if (result?.error) {
                  setError(result.error);
                } else {
                  setSuccess(true);
                  setTimeout(() => {
                    resetAndClose();
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
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
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
                required={!showWaitlistForm}
                slots={availableSlots}
                loading={slotsLoading}
                noDateSelected={!date}
              />
            </Field>

            <p className="text-sm text-text-secondary">
              מחיר: <span className="font-semibold text-text-primary">₪{calculateLessonPrice("individual", duration)}</span>
            </p>

            <Field label="אופן השיעור" htmlFor="delivery_mode">
              <select
                id="delivery_mode"
                name="delivery_mode"
                defaultValue={editingLesson?.delivery_mode ?? "in_person"}
                className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
              >
                <option value="in_person">פרונטלי</option>
                <option value="online">מקוון</option>
              </select>
            </Field>

            <Field label="נושא (אופציונלי)" htmlFor="topic">
              <TextInput id="topic" name="topic" placeholder="למשל: הכנה למבחן" defaultValue={editingLesson?.topic ?? ""} />
            </Field>

            {error && <p className="text-sm text-status-destructive">{error}</p>}
            {success && (
              <p className="text-sm text-status-confirmed">
                {isEditing ? "הבקשה עודכנה!" : "הבקשה נשלחה! ממתינה לאישור המורה."}
              </p>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={isPending || isFullyBooked}>
                {isPending ? "שולח..." : isEditing ? "שמירת שינויים" : "שליחת בקשה"}
              </Button>
            </div>
          </form>
        )}

        {isFullyBooked && subjects.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            {!showWaitlistForm ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-text-secondary">
                  אין שעות פנויות בתאריך הזה. אפשר להצטרף לרשימת המתנה - אם יתפנה מקום, המורה יוכל ליצור איתך קשר.
                </p>
                <Button type="button" variant="secondary" className="w-fit" onClick={() => setShowWaitlistForm(true)}>
                  הצטרפות לרשימת המתנה
                </Button>
              </div>
            ) : waitlistSuccess ? (
              <p className="text-sm text-status-confirmed">נוספת לרשימת ההמתנה!</p>
            ) : (
              <div className="flex flex-col gap-3">
                <Field label="הערה (אופציונלי) - למשל: רק אחרי 18:00, כל היום מתאים" htmlFor="waitlist_note">
                  <TextInput
                    id="waitlist_note"
                    value={waitlistNote}
                    onChange={(e) => setWaitlistNote(e.target.value)}
                    placeholder="פרטים נוספים על השעות שמתאימות לך"
                  />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowWaitlistForm(false)}>
                    ביטול
                  </Button>
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setError(null);
                      const fd = new FormData();
                      fd.set("date", date);
                      fd.set("subject_id", subjectId);
                      fd.set("note", waitlistNote);
                      startTransition(async () => {
                        const result = await joinWaitlist(fd);
                        if (result?.error) setError(result.error);
                        else {
                          setWaitlistSuccess(true);
                          setTimeout(() => {
                            resetAndClose();
                            setWaitlistSuccess(false);
                          }, 1200);
                        }
                      });
                    }}
                  >
                    {isPending ? "מצטרף/ת..." : "הצטרפות לרשימת המתנה"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
