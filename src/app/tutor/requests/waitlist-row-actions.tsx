"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { NewLessonModal } from "@/app/tutor/calendar/new-lesson-modal";
import { resolveWaitlistEntry } from "./actions";
import type { Tables } from "@/types/database";

type Student = Pick<Tables<"students">, "id" | "display_name">;
type Subject = Tables<"subjects">;

export function WaitlistRowActions({
  id,
  date,
  subjectId,
  studentId,
  students,
  subjects,
}: {
  id: string;
  date: string;
  /** The entry's own requested subject, if any - prefilled but still
   * editable, since the tutor might book a different subject entirely. */
  subjectId?: string;
  /** Resolved server-side: the requester's own student row when it's
   * unambiguous (a student themself, or a parent with exactly one linked
   * child). Left undefined when a parent has more than one child - the
   * tutor picks from the modal's own student list instead of guessing. */
  studentId?: string;
  students: Student[];
  subjects: Subject[];
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (confirmingRemove) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => setConfirmingRemove(false)}>
            חזרה
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await resolveWaitlistEntry(id, "cancelled");
                if (result?.error) setError(result.error);
                else setConfirmingRemove(false);
              })
            }
          >
            {isPending ? "מסיר..." : "כן, להסיר"}
          </Button>
        </div>
        {error && <p className="max-w-56 break-words text-xs text-status-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="text-xs" onClick={() => setConfirmingRemove(true)}>
          הסרה
        </Button>
        <NewLessonModal
          students={students}
          subjects={subjects}
          triggerLabel="יצירת שיעור"
          triggerClassName="text-xs"
          initialDate={date}
          initialStudentId={studentId}
          initialSubjectId={subjectId}
          onCreated={() =>
            startTransition(async () => {
              await resolveWaitlistEntry(id, "fulfilled");
            })
          }
        />
      </div>
      {error && <p className="max-w-56 text-xs text-status-destructive">{error}</p>}
    </div>
  );
}
