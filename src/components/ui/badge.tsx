import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "confirmed" | "pending" | "selected" | "destructive" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  confirmed: "bg-status-confirmed-bg text-status-confirmed",
  pending: "bg-status-pending-bg text-status-pending",
  selected: "bg-status-selected-bg text-status-selected",
  destructive: "bg-status-destructive-bg text-status-destructive",
  neutral: "bg-surface-muted text-text-secondary",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
