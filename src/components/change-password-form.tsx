"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type Status = { type: "idle" } | { type: "loading" } | { type: "error"; message: string } | { type: "success" };

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setStatus({ type: "error", message: "הסיסמה חייבת להכיל לפחות 8 תווים" });
      return;
    }
    if (password !== confirm) {
      setStatus({ type: "error", message: "הסיסמאות אינן תואמות" });
      return;
    }

    setStatus({ type: "loading" });
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({ type: "success" });
      setPassword("");
      setConfirm("");
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <Field label="סיסמה חדשה" htmlFor="new-password">
        <TextInput
          id="new-password"
          type="password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="אימות סיסמה" htmlFor="confirm-password">
        <TextInput
          id="confirm-password"
          type="password"
          minLength={8}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>

      {status.type === "error" && <p className="text-sm text-status-destructive">{status.message}</p>}
      {status.type === "success" && (
        <p className="text-sm text-status-confirmed">הסיסמה עודכנה בהצלחה.</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={status.type === "loading"}>
          {status.type === "loading" ? "מעדכן..." : "עדכון סיסמה"}
        </Button>
      </div>
    </form>
  );
}
