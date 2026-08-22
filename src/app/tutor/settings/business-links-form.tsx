"use client";

import { useState, useTransition } from "react";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { updateBusinessLinks } from "./actions";
import type { Tables } from "@/types/database";

export function BusinessLinksForm({ links }: { links: Tables<"business_links"> }) {
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
            await updateBusinessLinks(formData);
            setSaved(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : "שגיאה לא צפויה");
          }
        });
      }}
    >
      <Field label="קישור לאתר" htmlFor="website_url">
        <TextInput
          id="website_url"
          name="website_url"
          type="url"
          placeholder="https://..."
          defaultValue={links.website_url ?? ""}
          dir="ltr"
        />
      </Field>
      <Field label="קישור לקהילה" htmlFor="community_url">
        <TextInput
          id="community_url"
          name="community_url"
          type="url"
          placeholder="https://..."
          defaultValue={links.community_url ?? ""}
          dir="ltr"
        />
      </Field>
      <Field label="פרטי יצירת קשר" htmlFor="contact_info">
        <TextInput
          id="contact_info"
          name="contact_info"
          placeholder="טלפון / וואטסאפ"
          defaultValue={links.contact_info ?? ""}
        />
      </Field>
      <Field label="קישור ל-Bit" htmlFor="bit_link">
        <TextInput
          id="bit_link"
          name="bit_link"
          type="url"
          placeholder="https://..."
          defaultValue={links.bit_link ?? ""}
          dir="ltr"
        />
      </Field>
      <Field label="קישור ל-PayBox" htmlFor="paybox_link">
        <TextInput
          id="paybox_link"
          name="paybox_link"
          type="url"
          placeholder="https://..."
          defaultValue={links.paybox_link ?? ""}
          dir="ltr"
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
