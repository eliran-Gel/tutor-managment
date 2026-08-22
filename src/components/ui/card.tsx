import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // min-w-0 matters because Card is almost always a flex/grid item -
        // without it, one long unbreakable child (e.g. a raw URL) forces
        // the whole row/column wider than the viewport, and since the app
        // sets overflow-x:hidden globally, that overflow doesn't scroll -
        // it just gets silently clipped off-screen.
        "min-w-0 rounded-card border border-border bg-surface p-5 shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 flex items-center justify-between", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-text-primary", className)} {...props} />
  );
}
