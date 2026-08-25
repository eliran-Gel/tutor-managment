"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelLesson } from "@/app/tutor/lessons/actions";

export function CancelLessonButton({ lessonId }: { lessonId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex w-full min-w-0 flex-col items-end gap-2 sm:w-auto">
        <span className="w-full break-words text-xs text-status-destructive sm:text-end">לבטל את השיעור?</span>
        <div className="flex shrink-0 items-center gap-2">
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
                const result = await cancelLesson(lessonId);
                if (result?.error) setError(result.error);
                else setConfirming(false);
              })
            }
          >
            {isPending ? "מבטל..." : "כן, לבטל"}
          </Button>
        </div>
        {error && <p className="text-xs text-status-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
      ביטול שיעור
    </Button>
  );
}
