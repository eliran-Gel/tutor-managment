"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { cancelLesson } from "@/app/tutor/lessons/actions";

export function CancelLessonButton({ lessonId }: { lessonId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // This button (and its confirm step) is sometimes nested inside a
  // clickable card that navigates elsewhere - stop the click from
  // bubbling up to that card's own handler.
  function stopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }

  if (confirming) {
    return (
      <div className="flex w-full min-w-0 max-w-full flex-col items-end gap-2" onClick={stopPropagation}>
        <span className="w-full break-words text-end text-xs text-status-destructive">לבטל את השיעור?</span>
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
    <Button
      type="button"
      variant="secondary"
      onClick={(e) => {
        stopPropagation(e);
        setConfirming(true);
      }}
    >
      ביטול שיעור
    </Button>
  );
}
