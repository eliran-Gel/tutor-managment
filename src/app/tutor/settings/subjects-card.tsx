"use client";

import { useRef, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { createSubject, setSubjectActive } from "./actions";
import type { Tables } from "@/types/database";

export function SubjectsCard({ subjects }: { subjects: Tables<"subjects">[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>מקצועות</CardTitle>
      </CardHeader>
      <p className="mb-4 text-xs text-text-muted">
        המקצועות האלה יופיעו בבחירה כשתלמיד/ה מבקש/ת שיעור.
      </p>

      {subjects.length === 0 ? (
        <p className="mb-4 text-sm text-text-muted">עדיין לא נוספו מקצועות.</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {subjects.map((subject) => (
            <li
              key={subject.id}
              className="min-w-0 flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-text-primary">{subject.name}</span>
                {!subject.active && <Badge tone="neutral" className="shrink-0">לא פעיל</Badge>}
              </div>
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-text-secondary hover:text-text-primary"
                onClick={() =>
                  startTransition(() => setSubjectActive(subject.id, !subject.active))
                }
              >
                {subject.active ? "השבתה" : "הפעלה"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        className="flex gap-2"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            try {
              await createSubject(formData);
              formRef.current?.reset();
            } catch (e) {
              setError(e instanceof Error ? e.message : "שגיאה לא צפויה");
            }
          });
        }}
      >
        <TextInput name="name" placeholder="מקצוע חדש" required className="flex-1" />
        <Button type="submit" variant="secondary" disabled={isPending}>
          הוספה
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-status-destructive">{error}</p>}
    </Card>
  );
}
