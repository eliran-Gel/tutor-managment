"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

type Status =
  | { type: "idle" }
  | { type: "loading-google" }
  | { type: "loading-magic-link" }
  | { type: "loading-password" }
  | { type: "redirecting" }
  | { type: "error"; message: string }
  | { type: "sent" };

const isBusy = (status: Status) =>
  status.type === "loading-google" ||
  status.type === "loading-magic-link" ||
  status.type === "loading-password" ||
  status.type === "redirecting";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"magic-link" | "password">("magic-link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  useEffect(() => {
    // Reading the ?error= query param requires the browser URL, which
    // isn't available during SSR - this one-time check on mount is
    // intentional (surfaces a failed /auth/callback redirect as an error
    // message instead of silently landing back on this page).
    /* eslint-disable react-hooks/set-state-in-effect */
    if (new URLSearchParams(window.location.search).get("error") === "auth") {
      setStatus({ type: "error", message: "קישור ההתחברות פג תוקף או שכבר נעשה בו שימוש. יש לנסות שוב." });
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function signInWithGoogle() {
    setStatus({ type: "loading-google" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Without this, Google can silently sign in with whatever account
        // is already active in the browser instead of asking - easy to
        // land in someone else's account with zero indication anything
        // went wrong. This forces the account picker every time.
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) setStatus({ type: "error", message: error.message });
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ type: "loading-magic-link" });
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
    setStatus({ type: "loading-password" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus({ type: "error", message: error.message });
      return;
    }
    // Stay "busy" (buttons disabled, no re-click possible) all the way
    // through navigation instead of flipping back to idle first - that
    // gap is exactly what let a second click re-trigger sign-in before
    // the redirect landed.
    setStatus({ type: "redirecting" });
    router.push("/tutor/dashboard");
    router.refresh();
  }

  const busy = isBusy(status);

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={signInWithGoogle}
        disabled={busy}
      >
        {status.type === "loading-google" ? "מעביר ל-Google..." : "המשך עם Google"}
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
            <Button type="submit" variant="primary" disabled={busy}>
              {status.type === "loading-magic-link" ? "שולח..." : "שלח קישור התחברות"}
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
          <Button type="submit" variant="primary" disabled={busy}>
            {status.type === "loading-password"
              ? "מתחבר..."
              : status.type === "redirecting"
                ? "מעביר אותך פנימה..."
                : "התחברות"}
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
        disabled={busy}
        className="text-xs font-medium text-text-muted transition-transform duration-200 hover:text-text-secondary active:scale-90 disabled:opacity-50"
      >
        {mode === "magic-link" ? "יש לך סיסמה? התחברות עם סיסמה" : "התחברות עם קישור באימייל"}
      </button>

      <Link
        href="/signup"
        className="text-center text-xs font-medium text-text-muted transition-transform duration-200 hover:text-text-secondary active:scale-90"
      >
        עדיין אין לך חשבון? הרשמה
      </Link>
    </div>
  );
}
