"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Status = { type: "idle" } | { type: "loading" } | { type: "error"; message: string } | { type: "sent" };

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function signInWithGoogle() {
    setStatus({ type: "loading" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setStatus({ type: "error", message: error.message });
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ type: "loading" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({ type: "sent" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={signInWithGoogle}
        disabled={status.type === "loading"}
      >
        המשך עם Google
      </Button>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-border" />
        או
        <span className="h-px flex-1 bg-border" />
      </div>

      {status.type === "sent" ? (
        <p className="rounded-control bg-status-confirmed-bg px-4 py-3 text-sm text-status-confirmed">
          נשלח קישור התחברות לכתובת {email}. בדקו את תיבת הדואר.
        </p>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={sendMagicLink}>
          <input
            type="email"
            required
            placeholder="כתובת אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <Button type="submit" variant="primary" disabled={status.type === "loading"}>
            שלח קישור התחברות
          </Button>
        </form>
      )}

      {status.type === "error" && (
        <p className="text-sm text-status-destructive">{status.message}</p>
      )}
    </div>
  );
}
