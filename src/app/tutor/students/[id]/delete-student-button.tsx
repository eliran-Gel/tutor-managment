"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteStudent } from "../actions";

export function DeleteStudentButton({
  studentId,
  studentName,
  hasAccount,
}: {
  studentId: string;
  studentName: string;
  /** Whether this student has a real login (profile_id set) - only then
   * does "also delete the account" make sense to offer at all. */
  hasAccount: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [alsoDeleteAccount, setAlsoDeleteAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
        מחיקה לצמיתות
      </Button>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-end gap-2 sm:w-auto">
      <span className="w-full break-words text-sm text-status-destructive sm:text-end">
        למחוק את {studentName} לצמיתות? כל היסטוריית השיעורים שלו/ה תימחק. לא ניתן לבטל.
      </span>
      {hasAccount && (
        <label className="flex w-full items-start justify-end gap-2 text-xs text-text-secondary sm:text-end">
          <span>
            למחוק גם את ההתחברות שלו/ה (לא יוכל/תוכל להתחבר יותר עם האימייל הזה - מתאים בעיקר לחשבון בדיקה, לא לתלמיד/ה אמיתי/ת)
          </span>
          <input
            type="checkbox"
            checked={alsoDeleteAccount}
            onChange={(e) => setAlsoDeleteAccount(e.target.checked)}
            className="mt-0.5 shrink-0"
          />
        </label>
      )}
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => setConfirming(false)}>
          ביטול
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await deleteStudent(studentId, alsoDeleteAccount);
              if (result?.error) {
                setError(result.error);
                return;
              }
              router.push("/tutor/students");
            })
          }
        >
          {isPending ? "מוחק..." : "כן, למחוק"}
        </Button>
      </div>
      {error && <p className="text-xs text-status-destructive">{error}</p>}
    </div>
  );
}
