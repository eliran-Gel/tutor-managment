"use client";

import { useEffect, useEffectEvent } from "react";

export const EMAIL_VERIFIED_CHANNEL = "auth-email-verified";

const GIVE_UP_AFTER_MS = 30 * 60 * 1000;

/**
 * Lets the screen that said "a link was sent to your email" notice, on its
 * own, that the link has been used - so the person can click it in the
 * email (in any tab, or even on another device) and this screen just moves
 * on, instead of the link itself dragging them into the app.
 *
 * `check` returns true once it has handled the sign-in (it should redirect).
 * It's polled slowly (sign-in attempts are rate limited) but also runs
 * immediately whenever this tab regains focus or the verified page
 * announces itself over a BroadcastChannel (same browser), so in practice
 * the wait is near-instant.
 */
export function useVerificationWatcher(active: boolean, check: () => Promise<boolean>, intervalMs = 12000) {
  const runCheck = useEffectEvent(check);

  useEffect(() => {
    if (!active) return;

    let stopped = false;
    let running = false;

    async function run() {
      if (stopped || running) return;
      running = true;
      try {
        if (await runCheck()) stopped = true;
      } catch {
        // Not verified yet / transient network error - try again later.
      } finally {
        running = false;
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void run();
    }

    const interval = setInterval(() => void run(), intervalMs);
    const giveUp = setTimeout(() => {
      stopped = true;
    }, GIVE_UP_AFTER_MS);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(EMAIL_VERIFIED_CHANNEL) : null;
    channel?.addEventListener("message", () => void run());
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      stopped = true;
      clearInterval(interval);
      clearTimeout(giveUp);
      channel?.close();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [active, intervalMs]);
}
