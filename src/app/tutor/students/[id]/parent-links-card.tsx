"use client";

import { useRef, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { linkParentByEmail, unlinkParent } from "../actions";

type ParentLink = {
  id: string;
  parent_profile_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

export function ParentLinksCard({
  studentId,
  links,
}: {
  studentId: string;
  links: ParentLink[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>הורים מקושרים</CardTitle>
      </CardHeader>

      {links.length === 0 ? (
        <p className="mb-4 text-sm text-text-muted">אין הורים מקושרים כרגע.</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="min-w-0 flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {link.profiles?.full_name ?? "ללא שם"}
                </p>
                <p className="truncate text-xs text-text-muted">{link.profiles?.email}</p>
              </div>
              <button
                type="button"
                disabled={isPending}
                className="shrink-0 text-xs font-medium text-status-destructive hover:opacity-80 disabled:opacity-50"
                onClick={() => startTransition(() => unlinkParent(link.id, studentId))}
              >
                {isPending ? "מבטל..." : "ביטול קישור"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        className="flex flex-col gap-3"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await linkParentByEmail(studentId, formData);
            if (result?.error) {
              setError(result.error);
            } else {
              formRef.current?.reset();
            }
          });
        }}
      >
        <Field label="קישור הורה לפי אימייל" htmlFor="parent-email">
          <div className="flex gap-2">
            <TextInput
              id="parent-email"
              name="email"
              type="email"
              placeholder="parent@example.com"
              required
              className="flex-1"
            />
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "מקשר..." : "קישור"}
            </Button>
          </div>
        </Field>
        {error && <p className="text-sm text-status-destructive">{error}</p>}
        <p className="text-xs text-text-muted">
          ניתן לקשר רק משתמש שכבר התחבר פעם אחת למערכת עם האימייל הזה.
        </p>
      </form>
    </Card>
  );
}
