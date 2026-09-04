"use client";

import { useRef, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { inviteParent, linkParentByEmail, unlinkParent } from "../actions";

type ParentLink = {
  id: string;
  parent_profile_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

export function ParentLinksCard({
  studentId,
  studentName,
  links,
}: {
  studentId: string;
  studentName: string;
  links: ParentLink[];
}) {
  const [unlinkPending, startUnlink] = useTransition();

  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [invitePending, startInvite] = useTransition();
  const inviteFormRef = useRef<HTMLFormElement>(null);

  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkPending, startLink] = useTransition();
  const linkFormRef = useRef<HTMLFormElement>(null);

  const whatsappHref = inviteLink
    ? `https://wa.me/?text=${encodeURIComponent(
        `היי! הנה קישור להצטרפות למערכת הניהול של אלירן גלברג, כהורה של ${studentName}:\n${inviteLink}`,
      )}`
    : "#";

  return (
    <Card>
      <CardHeader>
        <CardTitle>הורים מקושרים</CardTitle>
      </CardHeader>

      {links.length === 0 ? (
        <p className="mb-4 text-sm text-text-muted">אין הורים מקושרים כרגע.</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="min-w-0 flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {link.profiles?.full_name ?? "ללא שם"}
                </p>
                <p className="truncate text-xs text-text-muted">{link.profiles?.email}</p>
              </div>
              <button
                type="button"
                disabled={unlinkPending}
                className="shrink-0 text-xs font-medium text-status-destructive transition-transform duration-200 hover:opacity-80 active:scale-85 disabled:opacity-50"
                onClick={() => startUnlink(() => unlinkParent(link.id, studentId))}
              >
                {unlinkPending ? "מבטל..." : "ביטול קישור"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={inviteFormRef}
        className="flex flex-col gap-3 border-t border-border pt-4"
        action={(formData) => {
          setInviteError(null);
          setInviteLink(null);
          setCopied(false);
          startInvite(async () => {
            const result = await inviteParent(studentId, formData);
            if (result?.error) {
              setInviteError(result.error);
            } else {
              inviteFormRef.current?.reset();
              setInviteLink(result?.inviteLink ?? null);
            }
          });
        }}
      >
        <Field label="הזמנת הורה חדש/ה למערכת" htmlFor="parent-invite-email">
          <div className="flex gap-2">
            <TextInput
              id="parent-invite-email"
              name="email"
              type="email"
              placeholder="parent@example.com"
              required
              className="flex-1"
            />
            <Button type="submit" disabled={invitePending}>
              {invitePending ? "יוצר..." : "יצירת קישור הזמנה"}
            </Button>
          </div>
        </Field>
        {inviteError && <p className="text-sm text-status-destructive">{inviteError}</p>}

        {inviteLink && (
          <div className="flex flex-col gap-2 rounded-control border border-border bg-surface-muted p-3">
            <p className="text-sm text-text-secondary">
              החשבון כבר נוצר ומקושר - צריך רק לשלוח את הקישור הזה להורה, בכל דרך שנוחה (וואטסאפ, מייל, אישית):
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteLink);
                  setCopied(true);
                }}
              >
                {copied ? "הועתק! ✓" : "העתקת קישור"}
              </Button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-control border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-transform duration-200 hover:bg-surface active:scale-95"
              >
                שליחה בוואטסאפ 📲
              </a>
            </div>
          </div>
        )}

        <p className="text-xs text-text-muted">
          מתאים כשההורה עוד לא רשום במערכת בכלל - הדרך הפשוטה ביותר, בלי שההורה צריך להירשם בעצמו.
        </p>
      </form>

      <form
        ref={linkFormRef}
        className="flex flex-col gap-3 border-t border-border pt-4"
        action={(formData) => {
          setLinkError(null);
          startLink(async () => {
            const result = await linkParentByEmail(studentId, formData);
            if (result?.error) {
              setLinkError(result.error);
            } else {
              linkFormRef.current?.reset();
            }
          });
        }}
      >
        <Field label="או קישור הורה שכבר רשום, לפי אימייל" htmlFor="parent-email">
          <div className="flex gap-2">
            <TextInput
              id="parent-email"
              name="email"
              type="email"
              placeholder="parent@example.com"
              required
              className="flex-1"
            />
            <Button type="submit" variant="secondary" disabled={linkPending}>
              {linkPending ? "מקשר..." : "קישור"}
            </Button>
          </div>
        </Field>
        {linkError && <p className="text-sm text-status-destructive">{linkError}</p>}
        <p className="text-xs text-text-muted">
          מתאים כשההורה כבר יש לו/ה חשבון במערכת (למשל בגלל ילד/ה אחר/ת) - אין צורך בהזמנה נוספת.
        </p>
      </form>
    </Card>
  );
}
