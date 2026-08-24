"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { GRADE_OPTIONS, currentSchoolYear } from "@/lib/grades";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "sent" };

export function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setStatus({ type: "error", message: "יש להזין שם מלא" });
      return;
    }
    if (trimmedName.length > 40) {
      setStatus({ type: "error", message: "שם יכול להכיל עד 40 תווים" });
      return;
    }

    setStatus({ type: "loading" });
    const supabase = createClient();
    const gradeNumber = grade ? Number(grade) : null;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: trimmedName,
          grade: gradeNumber,
          grade_year: gradeNumber ? currentSchoolYear() : null,
          school_name: schoolName.trim() || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({ type: "sent" });
    }
  }

  if (status.type === "sent") {
    return (
      <p className="rounded-control bg-status-confirmed-bg px-4 py-3 text-sm text-status-confirmed">
        נשלח קישור אישור לכתובת {email}. בדקו את תיבת הדואר ולחצו על הקישור כדי לסיים את ההרשמה.
      </p>
    );
  }

  const busy = status.type === "loading";

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <Field label="שם מלא" htmlFor="signup-name">
        <TextInput
          id="signup-name"
          required
          maxLength={40}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="השם שיוצג במערכת"
        />
      </Field>
      <Field label="כתובת אימייל" htmlFor="signup-email">
        <TextInput
          id="signup-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="כתובת אימייל"
        />
      </Field>
      <Field label="סיסמה" htmlFor="signup-password">
        <PasswordInput
          id="signup-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="לפחות 6 תווים"
        />
      </Field>
      <Field label="כיתה (אופציונלי)" htmlFor="signup-grade">
        <select
          id="signup-grade"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          <option value="">ללא</option>
          {GRADE_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="בית ספר (אופציונלי)" htmlFor="signup-school">
        <TextInput
          id="signup-school"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="שם בית הספר"
        />
      </Field>

      {status.type === "error" && <p className="text-sm text-status-destructive">{status.message}</p>}

      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "נרשם..." : "הרשמה"}
      </Button>

      <Link
        href="/login"
        className="text-center text-xs font-medium text-text-muted transition-transform duration-200 hover:text-text-secondary active:scale-90"
      >
        כבר יש לך חשבון? התחברות
      </Link>
    </form>
  );
}
