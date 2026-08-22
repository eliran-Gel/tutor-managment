"use client";

import { useTransition } from "react";
import { deleteAvailabilityBlock } from "./actions";

export function DeleteBlockButton({ blockId }: { blockId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => deleteAvailabilityBlock(blockId))}
      className="text-xs font-medium text-status-destructive hover:opacity-80 disabled:opacity-50"
    >
      {isPending ? "מוחק..." : "מחיקה"}
    </button>
  );
}
