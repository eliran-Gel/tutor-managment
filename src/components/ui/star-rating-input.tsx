"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function StarRatingInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: number | null;
}) {
  const [value, setValue] = useState(defaultValue ?? 0);

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value || ""} />
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`דירוג ${star} מתוך 5`}
          onClick={() => setValue(value === star ? 0 : star)}
          className={cn(
            "text-xl transition-colors",
            star <= value ? "text-status-pending" : "text-border hover:text-status-pending",
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}
