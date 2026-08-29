"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { enablePushNotifications, isIOSDevice, isStandaloneDisplay } from "@/lib/push-subscribe";
import { unsubscribeFromPush } from "@/app/push/actions";

type Status = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on";

/**
 * Permanent home for push notification settings - the dashboard's
 * PushPermissionCard is a one-shot dismissible nudge that never reappears
 * once closed, so this is the only way to enable (or disable) push later
 * if that initial prompt was missed or dismissed.
 */
export function NotificationSettingsCard() {
  const [status, setStatus] = useState<Status>("checking");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Environment/permission/subscription state only exists on the client
  // and requires an async check (service worker registration lookup), so
  // it can't be derived during render.
  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (typeof window === "undefined" || !("Notification" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (isIOSDevice() && !isStandaloneDisplay()) {
        if (!cancelled) setStatus("ios-install");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (!cancelled) setStatus(subscription ? "on" : "off");
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setError(null);
    setIsPending(true);
    try {
      const result = await enablePushNotifications();
      if (result.error) setError(result.error);
      else setStatus("on");
    } catch {
      setError("ההפעלה נכשלה - נסה/י שוב.");
    } finally {
      setIsPending(false);
    }
  }

  async function disable() {
    setError(null);
    setIsPending(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("הכיבוי נכשל - נסה/י שוב.");
    } finally {
      setIsPending(false);
    }
  }

  if (status === "unsupported") return null;

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>התראות</CardTitle>
      </CardHeader>

      {status === "checking" && <p className="text-sm text-text-muted">בודק סטטוס...</p>}

      {status === "ios-install" && (
        <p className="text-sm text-text-secondary">
          כדי לקבל התראות באייפון: לחצו על כפתור השיתוף בסרגל הדפדפן, ואז על &quot;הוספה למסך הבית&quot;. לאחר מכן חזרו
          לכאן.
        </p>
      )}

      {status === "denied" && (
        <p className="text-sm text-text-secondary">
          ההתראות חסומות בהגדרות הדפדפן/מכשיר. יש לאפשר אותן שם ידנית עבור האתר הזה כדי להפעיל מכאן.
        </p>
      )}

      {status === "off" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-secondary">התראות כבויות במכשיר הזה.</p>
          {error && <p className="text-xs text-status-destructive">{error}</p>}
          <Button type="button" className="w-fit text-sm" disabled={isPending} onClick={enable}>
            {isPending ? "מפעיל..." : "הפעלת התראות"}
          </Button>
        </div>
      )}

      {status === "on" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-status-confirmed">התראות פעילות במכשיר הזה ✓</p>
          {error && <p className="text-xs text-status-destructive">{error}</p>}
          <Button type="button" variant="secondary" className="w-fit text-sm" disabled={isPending} onClick={disable}>
            {isPending ? "מכבה..." : "כיבוי התראות"}
          </Button>
        </div>
      )}
    </Card>
  );
}
