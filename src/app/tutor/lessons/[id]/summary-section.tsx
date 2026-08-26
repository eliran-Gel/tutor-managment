"use client";

import { useRef, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { uploadSummaryImage, deleteSummary } from "./actions";

type SummaryRow = { id: string; storage_path: string; signedUrl: string | null };

export function SummarySection({ lessonId, summaries }: { lessonId: string; summaries: SummaryRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadSummaryImage(lessonId, formData);
      if (result?.error) setError(result.error);
      else if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>סיכום שיעור</CardTitle>
      </CardHeader>

      {summaries.length === 0 ? (
        <p className="text-sm text-text-muted">עדיין לא הועלה סיכום לשיעור הזה.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {summaries.map((s) => (
            <div key={s.id} className="flex flex-col gap-1.5">
              {s.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.signedUrl} alt="סיכום שיעור" className="aspect-square w-full rounded-control border border-border object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-control border border-border bg-surface-muted text-xs text-text-muted">
                  שגיאה בטעינה
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                disabled={isPending}
                onClick={() => startTransition(async () => { await deleteSummary(s.id, s.storage_path, lessonId); })}
              >
                מחיקה
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <input ref={fileRef} type="file" accept="image/*" className="text-sm text-text-secondary" />
        {error && <p className="text-sm text-status-destructive">{error}</p>}
        <Button type="button" disabled={isPending} onClick={submit}>
          {isPending ? "מעלה..." : "העלאת תמונה"}
        </Button>
      </div>
    </Card>
  );
}
