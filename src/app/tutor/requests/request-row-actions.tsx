"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { approveRequest, rejectRequest } from "./actions";

export function RequestRowActions({ lessonId }: { lessonId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  // This block is sometimes nested inside a clickable card that navigates
  // elsewhere - stop clicks (including into the textarea) from bubbling
  // up to that card's own handler.
  function stopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }

  function submitReject() {
    setAction("reject");
    startTransition(async () => {
      setError(null);
      const result = await rejectRequest(lessonId, reason);
      if (result?.error) setError(result.error);
      else setRejecting(false);
    });
  }

  if (rejecting) {
    return (
      <div className="flex w-full min-w-0 flex-col items-end gap-2 sm:w-64" onClick={stopPropagation}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="הערה לתלמיד/ה (אופציונלי)"
          rows={2}
          disabled={isPending}
          className="w-full resize-none rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              setRejecting(false);
              setReason("");
              setError(null);
            }}
          >
            חזרה
          </Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={submitReject}>
            {isPending && action === "reject" ? "דוחה..." : "דחיית הבקשה"}
          </Button>
        </div>
        {error && <p className="max-w-56 break-words text-xs text-status-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1" onClick={stopPropagation}>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => setRejecting(true)}>
          דחייה
        </Button>
        <Button
          type="button"
          disabled={isPending}
          onClick={() => {
            setAction("approve");
            startTransition(async () => {
              setError(null);
              const result = await approveRequest(lessonId);
              if (result?.error) setError(result.error);
            });
          }}
        >
          {isPending && action === "approve" ? "מאשר..." : "אישור"}
        </Button>
      </div>
      {error && <p className="max-w-56 text-xs text-status-destructive">{error}</p>}
    </div>
  );
}
