"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolveLead } from "./actions";

export function LeadRowActions({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        className="text-xs"
        disabled={isPending}
        onClick={() => startTransition(async () => { await resolveLead(id, "contacted"); })}
      >
        סומן כטופל
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="text-xs"
        disabled={isPending}
        onClick={() => startTransition(async () => { await resolveLead(id, "dismissed"); })}
      >
        התעלמות
      </Button>
    </div>
  );
}
