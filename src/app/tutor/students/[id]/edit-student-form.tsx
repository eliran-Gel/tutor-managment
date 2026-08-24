"use client";

import { useState, useTransition } from "react";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { GRADE_OPTIONS, effectiveGrade } from "@/lib/grades";
import { updateStudent } from "../actions";
import type { Tables } from "@/types/database";

export function EditStudentForm({ student }: { student: Tables<"students"> }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentGrade =
    student.grade != null && student.grade_year != null
      ? effectiveGrade(student.grade, student.grade_year)
      : "";

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          try {
            await updateStudent(student.id, formData);
            setSaved(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : "שגיאה לא צפויה");
          }
        });
      }}
    >
      <Field label="שם מלא" htmlFor="display_name">
        <TextInput
          id="display_name"
          name="display_name"
          defaultValue={student.display_name}
          required
          maxLength={40}
        />
      </Field>
      <Field label="כיתה" htmlFor="grade">
        <select
          id="grade"
          name="grade"
          defaultValue={currentGrade}
          className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          <option value="">ללא</option>
          {GRADE_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="בית ספר" htmlFor="school_name">
        <TextInput id="school_name" name="school_name" defaultValue={student.school_name ?? ""} />
      </Field>

      {error && <p className="text-sm text-status-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-status-confirmed">נשמר בהצלחה.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "שומר..." : "שמירה"}
        </Button>
      </div>
    </form>
  );
}
