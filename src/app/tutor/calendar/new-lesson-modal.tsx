"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { TimeSlotSelect } from "@/components/ui/time-slot-select";
import { StudentCombobox, NEW_STUDENT } from "@/components/ui/student-combobox";
import { LESSON_DURATIONS } from "@/lib/lessons";
import { calculateLessonPrice } from "@/lib/pricing";
import {
  createManualLesson,
  createGuestStudentQuick,
  type ManualLessonInput,
} from "@/app/tutor/lessons/actions";
import type { Tables } from "@/types/database";

type Student = Pick<Tables<"students">, "id" | "display_name">;
type Subject = Tables<"subjects">;

const emptyParticipant = { student_id: "", newName: "" };

export function NewLessonModal({ students, subjects }: { students: Student[]; subjects: Subject[] }) {
  const [open, setOpen] = useState(false);
  const [lessonType, setLessonType] = useState<"individual" | "group">("individual");
  const [participants, setParticipants] = useState([{ ...emptyParticipant }]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [subjectId, setSubjectId] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"in_person" | "online">("in_person");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [submitAction, setSubmitAction] = useState<"create" | "force" | null>(null);
  const [isPending, startTransition] = useTransition();

  const pricePerStudent = calculateLessonPrice(lessonType, duration);

  function reset() {
    setLessonType("individual");
    setParticipants([{ ...emptyParticipant }]);
    setDate("");
    setStartTime("");
    setDuration(60);
    setSubjectId("");
    setDeliveryMode("in_person");
    setOnlineUrl("");
    setTopic("");
    setError(null);
    setConflict(null);
    setSubmitAction(null);
  }

  function updateParticipant(index: number, field: "student_id" | "newName", value: string) {
    setParticipants((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "student_id" && value !== NEW_STUDENT) next[index].newName = "";
      return next;
    });
  }

  function addParticipantRow() {
    setParticipants((prev) => (prev.length < 3 ? [...prev, { ...emptyParticipant }] : prev));
  }

  function removeParticipantRow(index: number) {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  }

  function validateParticipants(): string | null {
    const usable = participants.filter((p) => p.student_id);
    if (!date || !startTime || !subjectId || usable.length === 0) {
      return "יש למלא את כל השדות הנדרשים ולבחור לפחות תלמיד/ה אחד/ת";
    }
    for (const p of usable) {
      if (p.student_id === NEW_STUDENT && !p.newName.trim()) {
        return "יש להזין שם לתלמיד/ה החדש/ה";
      }
    }
    return null;
  }

  function submit(forced: boolean) {
    setError(null);
    const validationError = validateParticipants();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitAction(forced ? "force" : "create");
    startTransition(async () => {
      const usable = participants.filter((p) => p.student_id);

      // Resolve any "new student" rows to real student ids first, writing
      // them back into state - if a conflict prompt follows, a subsequent
      // forced submit must reuse these ids rather than creating duplicate
      // guest students for the same rows.
      const resolvedIds: string[] = [];
      const nextParticipants = [...participants];

      for (const p of usable) {
        const idx = participants.indexOf(p);
        if (p.student_id === NEW_STUDENT) {
          const result = await createGuestStudentQuick(p.newName);
          if ("error" in result) {
            setError(`שגיאה ביצירת ${p.newName}: ${result.error}`);
            return;
          }
          resolvedIds.push(result.id);
          nextParticipants[idx] = { student_id: result.id, newName: "" };
        } else {
          resolvedIds.push(p.student_id);
        }
      }
      setParticipants(nextParticipants);

      const input: ManualLessonInput = {
        date,
        start_time: startTime,
        duration_minutes: duration,
        lesson_type: lessonType,
        delivery_mode: deliveryMode,
        subject_id: subjectId,
        topic: topic || null,
        online_url: deliveryMode === "online" ? onlineUrl || null : null,
        forced,
        student_ids: resolvedIds,
      };

      const result = await createManualLesson(input);
      if (result?.conflict) {
        setConflict(result.message);
      } else if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
        reset();
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        שיעור חדש
      </Button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="שיעור חדש"
      >
        <div className="flex flex-col gap-4">
          <Field label="סוג שיעור" htmlFor="lesson_type">
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="lesson_type"
                  checked={lessonType === "individual"}
                  onChange={() => {
                    setLessonType("individual");
                    setParticipants((prev) => prev.slice(0, 1));
                  }}
                />
                יחיד
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="lesson_type"
                  checked={lessonType === "group"}
                  onChange={() => setLessonType("group")}
                />
                קבוצתי (עד 3 תלמידים)
              </label>
            </div>
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-secondary">תלמידים</span>
            {participants.map((p, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <StudentCombobox
                  students={students.filter(
                    (s) => !participants.some((other, j) => j !== i && other.student_id === s.id),
                  )}
                  value={p.student_id === NEW_STUDENT ? "" : p.student_id}
                  displayName={students.find((s) => s.id === p.student_id)?.display_name ?? ""}
                  onSelect={(id) => updateParticipant(i, "student_id", id)}
                />
                {p.student_id === NEW_STUDENT && (
                  <TextInput
                    placeholder="שם התלמיד/ה החדש/ה"
                    value={p.newName}
                    onChange={(e) => updateParticipant(i, "newName", e.target.value)}
                    className="min-w-0 flex-1"
                  />
                )}
                {lessonType === "group" && participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParticipantRow(i)}
                    className="shrink-0 text-status-destructive transition-transform duration-200 active:scale-85"
                    aria-label="הסרה"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {lessonType === "group" && participants.length < 3 && (
              <button
                type="button"
                onClick={addParticipantRow}
                className="self-start text-sm font-medium text-brand-accent transition-transform duration-200 hover:underline active:scale-90"
              >
                + הוספת תלמיד/ה
              </button>
            )}
          </div>

          <Field label="תאריך" htmlFor="ml-date">
            <TextInput id="ml-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="שעת התחלה" htmlFor="ml-start">
              <TimeSlotSelect id="ml-start" value={startTime} onChange={setStartTime} required />
            </Field>
            <Field label="משך" htmlFor="ml-duration">
              <select
                id="ml-duration"
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
          </div>

          <div className="rounded-control bg-surface-muted px-4 py-2 text-sm text-text-secondary">
            מחיר לתלמיד/ה: <span className="font-semibold text-text-primary">₪{pricePerStudent}</span>
            {lessonType === "group" && participants.filter((p) => p.student_id).length > 1 && (
              <span>
                {" "}
                · סה&quot;כ ₪{pricePerStudent * participants.filter((p) => p.student_id).length}
              </span>
            )}
          </div>

          <Field label="מקצוע" htmlFor="ml-subject">
            <select
              id="ml-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="">בחר/י מקצוע</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="אופן השיעור" htmlFor="ml-delivery">
            <select
              id="ml-delivery"
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value as "in_person" | "online")}
              className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="in_person">פרונטלי</option>
              <option value="online">מקוון</option>
            </select>
          </Field>

          {deliveryMode === "online" && (
            <Field label="קישור לשיעור" htmlFor="ml-url">
              <TextInput
                id="ml-url"
                type="url"
                dir="ltr"
                placeholder="https://..."
                value={onlineUrl}
                onChange={(e) => setOnlineUrl(e.target.value)}
              />
            </Field>
          )}

          <Field label="נושא (אופציונלי)" htmlFor="ml-topic">
            <TextInput id="ml-topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </Field>

          {error && <p className="text-sm text-status-destructive">{error}</p>}

          {conflict ? (
            // Replaces the normal button row entirely while a conflict is
            // pending - it must never coexist with "יצירת שיעור", since a
            // layout shift plus a confused re-click there is exactly what
            // silently force-created an overlapping lesson in practice.
            <div className="rounded-control border-2 border-status-pending bg-status-pending-bg px-4 py-3 text-sm">
              <p className="font-semibold text-status-pending">⚠ {conflict}</p>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => setConflict(null)}
                >
                  ביטול
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => submit(true)}
                >
                  {isPending && submitAction === "force" ? "יוצר..." : "כן, ליצור בכל זאת"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                ביטול
              </Button>
              <Button type="button" disabled={isPending} onClick={() => submit(false)}>
                {isPending && submitAction === "create" ? "יוצר..." : "יצירת שיעור"}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
