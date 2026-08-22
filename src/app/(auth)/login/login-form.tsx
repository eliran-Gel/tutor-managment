"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

type Status = { type: "idle" } | { type: "loading" } | { type: "error"; message: string } | { type: "sent" };

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"magic-link" | "password">("magic-link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ type: "loading" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus({ type: "error", message: error.message });
      return;
    }
    setStatus({ type: "idle" });
    router.push("/tutor/dashboard");
    router.refresh();
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

      {mode === "magic-link" ? (
        status.type === "sent" ? (
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
        )
      ) : (
        <form className="flex flex-col gap-3" onSubmit={signInWithPassword}>
          <input
            type="email"
            required
            placeholder="כתובת אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <PasswordInput
            required
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="primary" disabled={status.type === "loading"}>
            התחברות
          </Button>
        </form>
      )}

      {status.type === "error" && (
        <p className="text-sm text-status-destructive">{status.message}</p>
      )}

      <button
        type="button"
        onClick={() => {
          setMode(mode === "magic-link" ? "password" : "magic-link");
          setStatus({ type: "idle" });
        }}
        className="text-xs font-medium text-text-muted hover:text-text-secondary"
      >
        {mode === "magic-link" ? "יש לך סיסמה? התחברות עם סיסמה" : "התחברות עם קישור באימייל"}
      </button>
    </div>
  );
}
