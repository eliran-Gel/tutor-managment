"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveRequest, rejectRequest } from "./actions";

export function RequestRowActions({ lessonId }: { lessonId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            setAction("reject");
            startTransition(() => rejectRequest(lessonId));
          }}
        >
          {isPending && action === "reject" ? "דוחה..." : "דחייה"}
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
