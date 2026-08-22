"use client";

import { useRef, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { claimGuestByEmail } from "../actions";

export function ClaimGuestCard({ studentId }: { studentId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>חיבור חשבון</CardTitle>
      </CardHeader>
      <p className="mb-4 text-sm text-text-muted">
        התלמיד/ה עדיין אורח/ת ללא חשבון. לאחר שהתלמיד/ה יתחבר/תתחבר פעם אחת למערכת עם כתובת
        האימייל שלו/ה, ניתן לחבר את החשבון לפרופיל הקיים — ההיסטוריה תישמר במלואה.
      </p>
      <form
        ref={formRef}
        className="flex flex-col gap-3"
        action={(formData) => {
          setError(null);
          setSuccess(false);
          startTransition(async () => {
            const result = await claimGuestByEmail(studentId, formData);
            if (result?.error) {
              setError(result.error);
            } else {
              setSuccess(true);
              formRef.current?.reset();
            }
          });
        }}
      >
        <Field label="אימייל התלמיד/ה" htmlFor="claim-email">
          <div className="flex gap-2">
            <TextInput
              id="claim-email"
              name="email"
              type="email"
              placeholder="student@example.com"
              required
              className="flex-1"
            />
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "מחבר..." : "חיבור"}
            </Button>
          </div>
        </Field>
        {error && <p className="text-sm text-status-destructive">{error}</p>}
        {success && <p className="text-sm text-status-confirmed">החשבון חובר בהצלחה!</p>}
      </form>
    </Card>
  );
}
