const GRADE_LABELS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "יא", "יב"] as const;

export const GRADE_OPTIONS = GRADE_LABELS.map((label, i) => ({ value: i + 1, label }));

/** Israeli school year starts in September - a grade recorded in June still belongs to the year that began the previous September. */
export function currentSchoolYear(now = new Date()) {
  const month = now.getMonth() + 1;
  return month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
}

/** Advances a recorded grade by however many school-year boundaries (Septembers) have passed since it was recorded, capped at יב. */
export function effectiveGrade(grade: number, gradeYear: number, now = new Date()) {
  const yearsPassed = currentSchoolYear(now) - gradeYear;
  return Math.min(12, grade + yearsPassed);
}

export function formatGrade(grade: number | null, gradeYear: number | null, now = new Date()) {
  if (grade == null || gradeYear == null) return null;
  const current = effectiveGrade(grade, gradeYear, now);
  return GRADE_LABELS[current - 1] ?? null;
}
