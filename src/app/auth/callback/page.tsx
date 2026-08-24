"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Supabase's free tier can't customize email templates (custom SMTP or a
// paid plan is required), so magic-link/signup-confirmation emails use the
// default {{ .ConfirmationURL }} - Supabase's own /verify endpoint, which
// redirects here with the session in a URL *hash fragment*
// (#access_token=...). A server route can never see a hash fragment (it's
// never sent in the HTTP request), so this has to run client-side: parse
// the hash directly and call setSession(). OAuth (Google) instead lands
// here with a ?code= query param, handled the normal way.
export default function AuthCallbackPage() {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

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
        setErrored(true);
        // Hard navigation, not router.push: the session was just written to
        // cookies client-side (setSession/exchangeCodeForSession) and the
        // destination's server components need a fresh request to see it -
        // a soft client-side navigation can reuse a stale unauthenticated
        // render.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login?error=auth";
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
      window.location.href = profile?.role === "tutor" ? "/tutor/dashboard" : "/portal/dashboard";
    }

    handleCallback();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-text-secondary">
        {errored ? "אירעה שגיאה, מעביר לדף ההתחברות..." : "מתחבר..."}
      </p>
    </div>
  );
}
