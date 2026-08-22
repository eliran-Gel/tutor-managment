"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { GRADE_OPTIONS, currentSchoolYear, effectiveGrade } from "@/lib/grades";

type Status = { type: "idle" } | { type: "loading" } | { type: "error"; message: string } | { type: "success" };

export function EditGradeSchoolForm({
  studentId,
  currentGrade,
  currentGradeYear,
  currentSchoolName,
}: {
  studentId: string;
  currentGrade: number | null;
  currentGradeYear: number | null;
  currentSchoolName: string | null;
}) {
  const router = useRouter();
  const initialGrade =
    currentGrade != null && currentGradeYear != null ? effectiveGrade(currentGrade, currentGradeYear) : "";
  const [grade, setGrade] = useState<string>(String(initialGrade));
  const [schoolName, setSchoolName] = useState(currentSchoolName ?? "");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ type: "loading" });
    const supabase = createClient();
    const { error } = await supabase
      .from("students")
      .update({
        grade: grade ? Number(grade) : null,
        grade_year: grade ? currentSchoolYear() : null,
        school_name: schoolName.trim() || null,
      })
      .eq("id", studentId);
    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({ type: "success" });
      router.refresh();
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <Field label="כיתה" htmlFor="student-grade">
        <select
          id="student-grade"
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
      <Field label="בית ספר" htmlFor="student-school">
        <TextInput
          id="student-school"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="שם בית הספר"
        />
      </Field>
      {status.type === "error" && <p className="text-sm text-status-destructive">{status.message}</p>}
      {status.type === "success" && <p className="text-sm text-status-confirmed">נשמר בהצלחה.</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={status.type === "loading"}>
          {status.type === "loading" ? "שומר..." : "שמירה"}
        </Button>
      </div>
    </form>
  );
}
