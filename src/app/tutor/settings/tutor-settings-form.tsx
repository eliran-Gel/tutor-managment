"use client";

import { useState, useTransition } from "react";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { updateTutorSettings } from "./actions";
import type { Tables } from "@/types/database";

export function TutorSettingsForm({ settings }: { settings: Tables<"tutor_settings"> }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          try {
            await updateTutorSettings(formData);
            setSaved(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : "שגיאה לא צפויה");
          }
        });
      }}
    >
      <Field label="תזכורת תשלום אחרי (ימים)" htmlFor="payment_reminder_days">
        <TextInput
          id="payment_reminder_days"
          name="payment_reminder_days"
          type="number"
          min={1}
          defaultValue={settings.payment_reminder_days}
        />
      </Field>
      <p className="-mt-2 text-xs text-text-muted">
        לאחר כמה ימים משיעור שלא שולם המערכת תציג אותו כ&quot;דורש תשומת לב&quot; בלוח הבקרה. אין
        שליחת תזכורת אוטומטית — ההחלטה תמיד בידיך.
      </p>

      <Field label="משך שיעור ברירת מחדל (דקות)" htmlFor="default_lesson_duration">
        <TextInput
          id="default_lesson_duration"
          name="default_lesson_duration"
          type="number"
          min={1}
          defaultValue={settings.default_lesson_duration}
        />
      </Field>

      {error && <p className="text-sm text-status-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-status-confirmed">נשמר בהצלחה.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "שומר..." : "שמירה"}
        </Button>
      </div>
    </form>
  );
}
