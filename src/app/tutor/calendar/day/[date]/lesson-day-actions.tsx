"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelLesson } from "@/app/tutor/lessons/actions";

export function LessonDayActions({ lessonId }: { lessonId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-status-destructive">לבטל את השיעור?</span>
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
