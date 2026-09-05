"use client";

import { useTransition } from "react";
import { deleteAvailabilityAddition } from "./actions";

export function DeleteAdditionButton({ additionId }: { additionId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => deleteAvailabilityAddition(additionId))}
      className="text-xs font-medium text-status-destructive transition-transform duration-200 hover:opacity-80 active:scale-85 disabled:opacity-50"
    >
      {isPending ? "מוחק..." : "מחיקה"}
    </button>
  );
}
