"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

/**
 * Wraps a lesson row so tapping anywhere on it opens lesson management
 * (homework/files) - the action buttons inside (cancel, approve/reject)
 * stop propagation themselves, so they keep working without triggering
 * this navigation too.
 */
export function ClickableLessonCard({
  lessonId,
  className,
  children,
}: {
  lessonId: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/tutor/lessons/${lessonId}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(`/tutor/lessons/${lessonId}`);
      }}
      className={cn("cursor-pointer transition-colors duration-200 hover:bg-surface-muted", className)}
    >
      {children}
    </Card>
  );
}
