"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type Status = { type: "idle" } | { type: "loading" } | { type: "error"; message: string } | { type: "success" };

export function EditNameForm({ userId, currentName }: { userId: string; currentName: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(currentName ?? "");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ type: "loading" });
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() || null })
      .eq("id", userId);
    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({ type: "success" });
      router.refresh();
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <Field label="שם מלא" htmlFor="full-name">
        <TextInput
          id="full-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="השם שיוצג במערכת"
        />
      </Field>
      {status.type === "error" && <p className="text-sm text-status-destructive">{status.message}</p>}
      {status.type === "success" && <p className="text-sm text-status-confirmed">נשמר בהצלחה.</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={status.type === "loading"}>
          {status.type === "loading" ? "שומר..." : "שמירה"}
        </Button>
      </div>
    </form>
  );
}
