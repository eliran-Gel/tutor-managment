"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { updateLessonDetails } from "./actions";

export function LessonDetailsCard({
  lessonId,
  initialTopic,
  initialNotes,
}: {
  lessonId: string;
  initialTopic: string | null;
  initialNotes: string | null;
}) {
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateLessonDetails(lessonId, topic, notes);
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
        <Field label="נושא" htmlFor="lesson-topic">
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
          <Button type="button" disabled={isPending} onClick={submit}>
            {isPending ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
