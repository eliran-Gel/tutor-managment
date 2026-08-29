"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { enablePushNotifications, isIOSDevice, isStandaloneDisplay } from "@/lib/push-subscribe";

const DISMISS_KEY = "push_prompt_dismissed";

/**
 * iOS Safari has no in-browser push permission prompt at all - Web Push
 * only works there once the site is added to the home screen (iOS 16.4+).
 * So on iOS-not-yet-installed we show install instructions instead of a
 * permission button that would silently do nothing.
 *
 * This is a one-shot, dismissible nudge - once closed it never reappears
 * on that device (by design, so it doesn't nag). Enabling later is still
 * possible from the profile page's permanent notification settings.
 */
export function PushPermissionCard() {
  const [mode, setMode] = useState<"none" | "ios-install" | "enable">("none");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Environment detection (iOS/standalone/permission) only exists on the
  // client, so the initial mode can't be derived during render - it has
  // to be computed once after mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    if (isIOSDevice() && !isStandaloneDisplay()) {
      setMode("ios-install");
    } else if (Notification.permission === "default") {
      setMode("enable");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setMode("none");
  }

  async function enable() {
    setError(null);
    setIsSubscribing(true);
    try {
      const result = await enablePushNotifications();
      if (result.error) setError(result.error);
      else dismiss();
    } catch {
      setError("ההפעלה נכשלה - נסה/י שוב.");
    } finally {
      setIsSubscribing(false);
    }
  }

  if (mode === "none") return null;

  return (
    <Card className="mb-4 border-status-pending bg-status-pending-bg">
      {mode === "ios-install" ? (
        <>
          <p className="text-sm font-medium text-status-pending">
            כדי לקבל התראות באייפון: לחצו על כפתור השיתוף בסרגל הדפדפן, ואז על &quot;הוספה למסך הבית&quot;.
          </p>
          <Button type="button" variant="ghost" className="mt-2 text-xs" onClick={dismiss}>
            הבנתי, לא עכשיו
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-status-pending">רוצים לקבל התראות גם כשהאתר סגור?</p>
          {error && <p className="mt-1 text-xs text-status-destructive">{error}</p>}
          <div className="mt-2 flex gap-2">
            <Button type="button" className="text-xs" disabled={isSubscribing} onClick={enable}>
              {isSubscribing ? "מפעיל..." : "הפעלת התראות"}
            </Button>
            <Button type="button" variant="ghost" className="text-xs" onClick={dismiss}>
              לא עכשיו
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
