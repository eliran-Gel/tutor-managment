"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteStudent } from "../actions";

export function DeleteStudentButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
        מחיקה לצמיתות
      </Button>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-end gap-2 sm:w-auto">
      <span className="w-full break-words text-sm text-status-destructive sm:text-end">
        למחוק את {studentName} לצמיתות? כל היסטוריית השיעורים שלו/ה תימחק. לא ניתן לבטל.
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => setConfirming(false)}>
          ביטול
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await deleteStudent(studentId);
              if (result?.error) {
                setError(result.error);
                return;
              }
              router.push("/tutor/students");
            })
          }
        >
          {isPending ? "מוחק..." : "כן, למחוק"}
        </Button>
      </div>
      {error && <p className="text-xs text-status-destructive">{error}</p>}
    </div>
  );
}
