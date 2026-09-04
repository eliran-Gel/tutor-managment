"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { updateLessonDetails } from "./actions";
import type { Tables } from "@/types/database";

type Subject = Tables<"subjects">;

export function LessonDetailsCard({
  lessonId,
  subjects,
  initialSubjectId,
  initialTopic,
  initialNotes,
}: {
  lessonId: string;
  subjects: Subject[];
  initialSubjectId: string | null;
  initialTopic: string | null;
  initialNotes: string | null;
}) {
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? "");
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateLessonDetails(lessonId, subjectId, topic, notes);
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>פרטי השיעור</CardTitle>
      </CardHeader>

      <div className="flex flex-col gap-4">
        <Field label="מקצוע" htmlFor="lesson-subject">
          <select
            id="lesson-subject"
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

        <Field label="נושא (אופציונלי)" htmlFor="lesson-topic">
          <TextInput
            id="lesson-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="למשל: הכנה למבחן, פרק 3 - טריגונומטריה"
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lesson-notes" className="text-sm font-medium text-text-secondary">
            הערות (למורה בלבד)
          </label>
          <textarea
            id="lesson-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="מה עבר בשיעור, מה להמשיך בפעם הבאה..."
            className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <p className="text-xs text-text-muted">התוכן כאן אינו גלוי לתלמיד/ה או להורה בשום מצב.</p>
        </div>

        {error && <p className="text-sm text-status-destructive">{error}</p>}
        {saved && !error && <p className="text-sm text-status-confirmed">נשמר בהצלחה.</p>}

        <div className="flex justify-end">
          <Button type="button" disabled={isPending || !subjectId} onClick={submit}>
            {isPending ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
