"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { GRADE_OPTIONS } from "@/lib/grades";
import { createStudent } from "./actions";

export function AddStudentModal() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        תלמיד/ה חדש/ה
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="הוספת תלמיד/ה">
        <form
          ref={formRef}
          className="flex flex-col gap-4"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                await createStudent(formData);
                formRef.current?.reset();
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "שגיאה לא צפויה");
              }
            });
          }}
        >
          <p className="text-sm text-text-muted">
            ניתן להוסיף תלמיד/ה גם ללא כתובת אימייל — יישאר/תישאר תלמיד/ה אורח/ת עד לחיבור חשבון.
          </p>
          <Field label="שם מלא" htmlFor="display_name">
            <TextInput id="display_name" name="display_name" required autoFocus />
          </Field>
          <Field label="כיתה" htmlFor="grade">
            <select
              id="grade"
              name="grade"
              defaultValue=""
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
            <TextInput id="school_name" name="school_name" placeholder="שם בית הספר" />
          </Field>

          {error && <p className="text-sm text-status-destructive">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "שומר..." : "הוספה"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
