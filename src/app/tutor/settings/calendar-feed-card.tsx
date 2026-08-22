"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CalendarFeedCard({ token }: { token: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>סנכרון ליומן האייפון</CardTitle>
        </CardHeader>
        <p className="text-sm text-text-muted">
          תכונה זו טרם הוגדרה בשרת (חסר TUTOR_CALENDAR_FEED_TOKEN).
        </p>
      </Card>
    );
  }

  const httpsUrl = origin ? `${origin}/api/calendar/tutor.ics?token=${token}` : "";
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, "webcal://");

  return (
    <Card>
      <CardHeader>
        <CardTitle>סנכרון ליומן האייפון</CardTitle>
      </CardHeader>
      <p className="mb-4 text-sm text-text-secondary">
        השיעורים המאושרים שלך יופיעו אוטומטית ביומן הטלפון (Apple Calendar / Google Calendar), ויתעדכנו
        ברקע בלי לעשות שום דבר נוסף.
      </p>

      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-text-secondary">באייפון (או Mac)</p>
          <a
            href={webcalUrl}
            className="inline-block text-sm font-medium text-brand-accent underline transition-transform duration-200 active:scale-95"
          >
            לחצו כאן כדי להוסיף את היומן
          </a>
        </div>

        <div className="rounded-control bg-surface-muted px-3 py-2">
          <p className="mb-1 text-xs text-text-muted">
            אם הלחיצה לא עובדת, אפשר להוסיף ידנית: הגדרות ← יומן ← חשבונות ← הוספת חשבון ← אחר ← הוספת
            יומן במנוי, ולהדביק שם את הקישור הבא:
          </p>
          <div className="flex items-center gap-2">
            <code dir="ltr" className="min-w-0 flex-1 truncate text-xs text-text-secondary">
              {httpsUrl}
            </code>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 px-2 py-1 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(httpsUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "הועתק!" : "העתקה"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-status-destructive">
          הקישור הזה אישי - אל תשתפו אותו, כל מי שמחזיק בו יכול לראות את לוח הזמנים שלכם.
        </p>
      </div>
    </Card>
  );
}
