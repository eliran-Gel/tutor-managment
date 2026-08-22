"use client";

import { useState, useTransition } from "react";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { updateStudent } from "../actions";
import type { Tables } from "@/types/database";

export function EditStudentForm({ student }: { student: Tables<"students"> }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

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
        <TextInput id="display_name" name="display_name" defaultValue={student.display_name} required />
      </Field>
      <Field label="כיתה / שכבה" htmlFor="grade_level">
        <TextInput id="grade_level" name="grade_level" defaultValue={student.grade_level ?? ""} />
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
