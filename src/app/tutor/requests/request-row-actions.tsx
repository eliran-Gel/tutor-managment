"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveRequest, rejectRequest } from "./actions";

export function RequestRowActions({ lessonId }: { lessonId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => startTransition(() => rejectRequest(lessonId))}
        >
          דחייה
        </Button>
        <Button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await approveRequest(lessonId);
              if (result?.error) setError(result.error);
            })
          }
        >
          {isPending ? "מעדכן..." : "אישור"}
        </Button>
      </div>
      {error && <p className="max-w-56 text-xs text-status-destructive">{error}</p>}
    </div>
  );
}
