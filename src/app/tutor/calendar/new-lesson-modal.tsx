"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { LESSON_DURATIONS } from "@/lib/lessons";
import {
  createManualLesson,
  createGuestStudentQuick,
  type ManualLessonInput,
} from "@/app/tutor/lessons/actions";
import type { Tables } from "@/types/database";

type Student = Pick<Tables<"students">, "id" | "display_name" | "default_price">;
type Subject = Tables<"subjects">;

const NEW_STUDENT = "__new__";
const emptyParticipant = { student_id: "", price: "", newName: "" };

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

  function updateParticipant(index: number, field: "student_id" | "price" | "newName", value: string) {
    setParticipants((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "student_id") {
        next[index].newName = "";
        const student = students.find((s) => s.id === value);
        next[index].price = student?.default_price != null ? String(student.default_price) : "";
      }
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
    const usable = participants.filter((p) => p.student_id && p.price !== "");
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
      const usable = participants.filter((p) => p.student_id && p.price !== "");

      // Resolve any "new student" rows to real student ids first.
      const resolved: { student_id: string; price: number }[] = [];
      // Mirrors `participants` positionally so we can write resolved ids
      // back to state - if a conflict prompt follows, a subsequent forced
      // submit must reuse these ids rather than creating duplicate guest
      // students for the same "new" rows.
      const nextParticipants = [...participants];

      for (const p of usable) {
        const idx = participants.indexOf(p);
        if (p.student_id === NEW_STUDENT) {
          const result = await createGuestStudentQuick(p.newName, Number(p.price));
          if ("error" in result) {
            setError(`שגיאה ביצירת ${p.newName}: ${result.error}`);
            return;
          }
          resolved.push({ student_id: result.id, price: Number(p.price) });
          nextParticipants[idx] = { student_id: result.id, price: p.price, newName: "" };
        } else {
          resolved.push({ student_id: p.student_id, price: Number(p.price) });
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
        participants: resolved,
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
            <span className="text-sm font-medium text-text-secondary">תלמידים ומחיר</span>
            {participants.map((p, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <select
                  value={p.student_id}
                  onChange={(e) => updateParticipant(i, "student_id", e.target.value)}
                  className="min-w-0 flex-1 rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  <option value="">בחר/י תלמיד/ה</option>
                  <option value={NEW_STUDENT}>➕ תלמיד/ה חדש/ה (טרם נרשם/ה)</option>
                  {students
                    .filter((s) => !participants.some((other, j) => j !== i && other.student_id === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.display_name}
                      </option>
                    ))}
                </select>
                {p.student_id === NEW_STUDENT && (
                  <TextInput
                    placeholder="שם התלמיד/ה החדש/ה"
                    value={p.newName}
                    onChange={(e) => updateParticipant(i, "newName", e.target.value)}
                    className="min-w-0 flex-1"
                  />
                )}
                <TextInput
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="מחיר"
                  value={p.price}
                  onChange={(e) => updateParticipant(i, "price", e.target.value)}
                  className="w-24 shrink-0"
                />
                {lessonType === "group" && participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParticipantRow(i)}
                    className="shrink-0 text-status-destructive"
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
                className="self-start text-sm font-medium text-brand-accent hover:underline"
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
              <TextInput
                id="ml-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
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

          {conflict && (
            <div className="rounded-control bg-status-pending-bg px-4 py-3 text-sm text-status-pending">
              <p>{conflict}</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-2"
                disabled={isPending}
                onClick={() => submit(true)}
              >
                {isPending && submitAction === "force" ? "יוצר..." : "כן, ליצור בכל זאת"}
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-status-destructive">{error}</p>}

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
        </div>
      </Modal>
    </>
  );
}
