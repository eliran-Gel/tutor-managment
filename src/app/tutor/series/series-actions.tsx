"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatIsoDate } from "@/lib/dates/format";
import { extendLessonSeries, cancelLessonSeries } from "@/app/tutor/lessons/actions";

export function SeriesActions({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"extend" | "cancel" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleExtend() {
    setError(null);
    setMessage(null);
    setPendingAction("extend");
    startTransition(async () => {
      const result = await extendLessonSeries(seriesId);
      if (!result?.success) {
        setError(result?.error ?? "שגיאה");
        return;
      }
      const skippedNote =
        result.skipped.length > 0 ? ` (דולגו ${result.skipped.length}: ${result.skipped.map(formatIsoDate).join(", ")})` : "";
      setMessage(`נוספו ${result.created} מופעים${skippedNote}`);
      router.refresh();
    });
  }

  function handleCancel() {
    if (!confirm("לבטל את כל המופעים העתידיים של הסדרה הזו? מופעים שכבר התקיימו לא ייפגעו.")) return;
    setError(null);
    setMessage(null);
    setPendingAction("cancel");
    startTransition(async () => {
      const result = await cancelLessonSeries(seriesId);
      if (!result?.success) {
        setError(result?.error ?? "שגיאה");
        return;
      }
      setMessage(`בוטלו ${result.cancelledCount} מופעים עתידיים`);
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" className="text-xs" disabled={isPending} onClick={handleExtend}>
          {isPending && pendingAction === "extend" ? "מוסיף..." : "עוד 10 שבועות"}
        </Button>
        <Button type="button" variant="destructive" className="text-xs" disabled={isPending} onClick={handleCancel}>
          {isPending && pendingAction === "cancel" ? "מבטל..." : "ביטול סדרה"}
        </Button>
      </div>
      {message && <p className="text-xs text-status-confirmed">{message}</p>}
      {error && <p className="text-xs text-status-destructive">{error}</p>}
    </div>
  );
}
