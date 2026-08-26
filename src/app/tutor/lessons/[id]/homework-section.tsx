"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { formatIsoDate } from "@/lib/dates/format";
import { assignHomework, deleteHomework } from "./actions";

type ParticipantOption = { student_id: string; display_name: string };
type HomeworkRow = {
  id: string;
  student_id: string;
  description: string;
  due_date: string | null;
  is_done: boolean;
};

export function HomeworkSection({
  lessonId,
  participants,
  homework,
}: {
  lessonId: string;
  participants: ParticipantOption[];
  homework: HomeworkRow[];
}) {
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selected, setSelected] = useState<string[]>(() => participants.map((p) => p.student_id));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleSelected(studentId: string) {
    setSelected((prev) => (prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await assignHomework({
        lesson_id: lessonId,
        student_ids: selected,
        description,
        due_date: dueDate || null,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setDescription("");
        setDueDate("");
      }
    });
  }

  function nameFor(studentId: string) {
    return participants.find((p) => p.student_id === studentId)?.display_name ?? "תלמיד/ה";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>שיעורי בית</CardTitle>
      </CardHeader>

      {homework.length === 0 ? (
        <p className="text-sm text-text-muted">עדיין לא הוקצו שיעורי בית לשיעור הזה.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {homework.map((hw) => (
            <div key={hw.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{nameFor(hw.student_id)}</p>
                <p className="break-words text-sm text-text-secondary">{hw.description}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {hw.due_date && `עד ${formatIsoDate(hw.due_date)} · `}
                  {hw.is_done ? "בוצע" : "לא בוצע"}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                disabled={isPending}
                onClick={() => startTransition(async () => { await deleteHomework(hw.id, lessonId); })}
              >
                מחיקה
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
        <Field label="תיאור" htmlFor="hw-description">
          <TextInput
            id="hw-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="למשל: תרגילים 1-5 בעמוד 42"
          />
        </Field>
        <Field label="תאריך יעד (אופציונלי)" htmlFor="hw-due-date">
          <TextInput id="hw-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>

        {participants.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-text-primary">עבור</p>
            {participants.map((p) => (
              <label key={p.student_id} className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={selected.includes(p.student_id)}
                  onChange={() => toggleSelected(p.student_id)}
                />
                {p.display_name}
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-status-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button type="button" disabled={isPending || !description.trim() || selected.length === 0} onClick={submit}>
            {isPending ? "מוסיף..." : "הוספת שיעורי בית"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
