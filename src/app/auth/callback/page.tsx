"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { EMAIL_VERIFIED_CHANNEL } from "@/lib/auth/use-verification-watcher";

type View = "working" | "error" | "signup-verified" | "magic-link-verified";

// Supabase's free tier can't customize email templates (custom SMTP or a
// paid plan is required), so magic-link/signup-confirmation emails use the
// default {{ .ConfirmationURL }} - Supabase's own /verify endpoint, which
// redirects here with the session in a URL *hash fragment*
// (#access_token=...). A server route can never see a hash fragment (it's
// never sent in the HTTP request), so this has to run client-side: parse
// the hash directly and call setSession(). OAuth (Google) instead lands
// here with a ?code= query param, handled the normal way.
//
// Email-verification links (type=signup / type=magiclink) deliberately do
// NOT carry the person into the app from this tab anymore: the screen they
// asked for the link from ("a link was sent to your email") signs itself in
// the moment the link is used, so this page only confirms it worked.
export default function AuthCallbackPage() {
  const [view, setView] = useState<View>("working");

  useEffect(() => {
    const supabase = createClient();

    function announceVerified() {
      if (typeof BroadcastChannel === "undefined") return;
      const channel = new BroadcastChannel(EMAIL_VERIFIED_CHANNEL);
      channel.postMessage("verified");
      channel.close();
    }

    async function handleCallback() {
      // A refresh of the "verified" page must keep showing it (the tokens
      // were already removed from the address bar - see below).
      const verifiedParam = new URLSearchParams(window.location.search).get("verified");
      if (verifiedParam === "signup" || verifiedParam === "magiclink") {
        setView(verifiedParam === "signup" ? "signup-verified" : "magic-link-verified");
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      // Signup confirmation: Supabase already marked the email as verified
      // when the link was opened, so there's nothing left to do here - the
      // tokens are intentionally not used, and the sign-up screen logs in
      // with the password it still has.
      if (type === "signup" && access_token && refresh_token) {
        // Drop the unused tokens from the address bar.
        window.history.replaceState(null, "", `${window.location.pathname}?verified=signup`);
        announceVerified();
        setView("signup-verified");
        return;
      }

      let userId: string | undefined;

      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error) userId = data.user?.id;
      } else {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) userId = data.user?.id;
        }
      }

      if (!userId) {
        setView("error");
        // Hard navigation, not router.push: the session was just written to
        // cookies client-side (setSession/exchangeCodeForSession) and the
        // destination's server components need a fresh request to see it -
        // a soft client-side navigation can reuse a stale unauthenticated
        // render.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login?error=auth";
        return;
      }

      // Login-by-email-link: the session now exists in this browser, so the
      // login screen that asked for the link (same browser) picks it up and
      // continues by itself - this tab just confirms.
      if (type === "magiclink") {
        window.history.replaceState(null, "", `${window.location.pathname}?verified=magiclink`);
        announceVerified();
        setView("magic-link-verified");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
      window.location.href = profile?.role === "tutor" ? "/tutor/dashboard" : "/portal/dashboard";
    }

    handleCallback();
  }, []);

  if (view === "signup-verified" || view === "magic-link-verified") {
    const isSignup = view === "signup-verified";
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-status-confirmed-bg text-xl text-status-confirmed">
            ✓
          </div>
          <h1 className="text-xl font-bold font-display text-text-primary">
            {isSignup ? "המייל אומת בהצלחה" : "ההתחברות אושרה"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {isSignup
              ? "נא לחזור למסך ההתחברות כדי להמשיך. אם נשארת בלשונית שבה נרשמת, ההתחברות תתבצע שם אוטומטית."
              : "נא לחזור למסך ההתחברות כדי להמשיך. הלשונית שממנה ביקשת להתחבר תיכנס למערכת אוטומטית."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {isSignup ? (
              <Link
                href="/login"
                className="rounded-control bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-transform duration-200 active:scale-95"
              >
                למסך ההתחברות
              </Link>
            ) : (
              <a
                href="/portal/dashboard"
                className="rounded-control bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-transform duration-200 active:scale-95"
              >
                להמשיך למערכת כאן
              </a>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-text-secondary">
        {view === "error" ? "אירעה שגיאה, מעביר לדף ההתחברות..." : "מתחבר..."}
      </p>
    </div>
  );
}
