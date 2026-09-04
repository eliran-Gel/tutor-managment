"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { formatIsoDate } from "@/lib/dates/format";
import { addGrade, deleteGrade } from "../actions";

type Subject = { id: string; name: string };
type GradeRow = {
  id: string;
  title: string;
  score: number;
  max_score: number;
  exam_date: string;
  note: string | null;
  subjects: { name: string } | null;
};

// A grade's percentage decides its color the same way homework's is_done
// badge does (confirmed/pending/destructive tones) - green from 80,
// yellow from 60, red below that. Arbitrary thresholds, not a school
// policy - just enough to make a long list scannable at a glance.
function toneFor(score: number, maxScore: number): "confirmed" | "pending" | "destructive" {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return "confirmed";
  if (pct >= 60) return "pending";
  return "destructive";
}

export function GradesCard({
  studentId,
  subjects,
  grades,
}: {
  studentId: string;
  subjects: Subject[];
  grades: GradeRow[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await addGrade({
        student_id: studentId,
        subject_id: subjectId || null,
        title,
        score: Number(score),
        max_score: Number(maxScore) || 100,
        exam_date: examDate,
        note: note.trim() || null,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setTitle("");
      setScore("");
      setMaxScore("100");
      setNote("");
      setShowForm(false);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ציונים והתקדמות</CardTitle>
        <Badge tone="neutral">{grades.length}</Badge>
      </CardHeader>

      {grades.length === 0 ? (
        <p className="text-sm text-text-muted">עדיין לא נרשמו ציונים לתלמיד/ה זה.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {grades.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{g.title}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {g.subjects?.name && `${g.subjects.name} · `}
                  {formatIsoDate(g.exam_date)}
                  {g.note && ` · ${g.note}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={toneFor(g.score, g.max_score)}>
                  {g.score}/{g.max_score}
                </Badge>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  disabled={isPending}
                  onClick={() => startTransition(async () => { await deleteGrade(g.id, studentId); })}
                >
                  מחיקה
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <Field label="כותרת" htmlFor="grade-title">
            <TextInput
              id="grade-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="למשל: מבחן אמצע, בגרות תרגול 3"
              autoFocus
            />
          </Field>

          <Field label="מקצוע (אופציונלי)" htmlFor="grade-subject">
            <select
              id="grade-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="">ללא מקצוע ספציפי</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ציון" htmlFor="grade-score">
              <TextInput id="grade-score" type="number" min={0} value={score} onChange={(e) => setScore(e.target.value)} />
            </Field>
            <Field label="מתוך" htmlFor="grade-max-score">
              <TextInput id="grade-max-score" type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </Field>
          </div>

          <Field label="תאריך" htmlFor="grade-date">
            <TextInput id="grade-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </Field>

          <Field label="הערה (אופציונלי)" htmlFor="grade-note">
            <TextInput id="grade-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          {error && <p className="text-sm text-status-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={isPending} onClick={() => setShowForm(false)}>
              ביטול
            </Button>
            <Button type="button" disabled={isPending || !title.trim() || !score || !examDate} onClick={submit}>
              {isPending ? "מוסיף..." : "הוספה"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
            + הוספת ציון
          </Button>
        </div>
      )}
    </Card>
  );
}
