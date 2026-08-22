"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRatingInput } from "@/components/ui/star-rating-input";
import { upsertInternalNotes } from "../actions";
import type { Tables } from "@/types/database";

export function InternalNotesCard({
  studentId,
  notes,
}: {
  studentId: string;
  notes: Tables<"student_internal_notes"> | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="border-status-selected/30 bg-status-selected-bg/30">
      <CardHeader>
        <CardTitle>הערות פנימיות (למורה בלבד)</CardTitle>
      </CardHeader>
      <p className="mb-4 text-xs text-text-muted">
        התוכן כאן אינו גלוי לתלמיד/ה או להורה בשום מצב — מוגן ברמת מסד הנתונים.
      </p>
      <form
        className="flex flex-col gap-4"
        action={(formData) => {
          setError(null);
          setSaved(false);
          startTransition(async () => {
            try {
              await upsertInternalNotes(studentId, formData);
              setSaved(true);
            } catch (e) {
              setError(e instanceof Error ? e.message : "שגיאה לא צפויה");
            }
          });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-secondary">רמה / התקדמות</span>
          <StarRatingInput name="rating" defaultValue={notes?.rating} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-text-secondary">
            הערות
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={notes?.notes ?? ""}
            className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent"
            placeholder="קשיים, נקודות לחיזוק, הכנה לשיעור הבא..."
          />
        </div>

        {error && <p className="text-sm text-status-destructive">{error}</p>}
        {saved && !error && <p className="text-sm text-status-confirmed">נשמר בהצלחה.</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
