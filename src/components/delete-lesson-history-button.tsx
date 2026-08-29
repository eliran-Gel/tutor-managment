"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { deleteLessonFromHistory } from "@/app/tutor/students/actions";

export function DeleteLessonHistoryButton({ lessonId, studentId }: { lessonId: string; studentId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function stopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }

  if (confirming) {
    return (
      <div className="flex w-full min-w-0 max-w-full flex-col items-end gap-2" onClick={stopPropagation}>
        <span className="w-full break-words text-end text-xs text-status-destructive">
          למחוק לצמיתות? לא ניתן לבטל.
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => setConfirming(false)}>
            חזרה
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await deleteLessonFromHistory(lessonId, studentId);
                if (result?.error) setError(result.error);
                else setConfirming(false);
              })
            }
          >
            {isPending ? "מוחק..." : "כן, מחיקה"}
          </Button>
        </div>
        {error && <p className="text-xs text-status-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="text-xs"
      onClick={(e) => {
        stopPropagation(e);
        setConfirming(true);
      }}
    >
      מחיקה מההיסטוריה
    </Button>
  );
}
