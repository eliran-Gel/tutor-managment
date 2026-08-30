import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGrade } from "@/lib/grades";
import { AddStudentModal } from "./add-student-modal";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";

  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("id, display_name, is_guest, grade, grade_year, school_name, archived_at")
    .order("display_name");

  query = showArchived ? query.not("archived_at", "is", null) : query.is("archived_at", null);

  const { data: students, error } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-display text-text-primary">תלמידים</h1>
          <p className="text-sm text-text-secondary">
            {showArchived ? "תלמידים בארכיון" : "כל התלמידים הפעילים"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={showArchived ? "/tutor/students" : "/tutor/students?archived=1"}
            className="text-sm font-medium text-text-secondary transition-transform duration-200 hover:text-text-primary active:scale-90"
          >
            {showArchived ? "הצג פעילים" : "הצג ארכיון"}
          </Link>
          <AddStudentModal />
        </div>
      </div>

      {error && (
        <p className="text-sm text-status-destructive">שגיאה בטעינת התלמידים: {error.message}</p>
      )}

      {students && students.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">
            {showArchived ? "אין תלמידים בארכיון." : "עדיין אין תלמידים. הוסיפו את התלמיד/ה הראשון/ה."}
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {students?.map((student) => (
          <Link key={student.id} href={`/tutor/students/${student.id}`} className="block transition-transform duration-200 active:scale-95">
            <Card className="h-full transition-shadow hover:shadow-none">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate font-semibold text-text-primary">{student.display_name}</p>
                {student.is_guest && <Badge tone="pending" className="shrink-0">אורח/ת</Badge>}
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {(() => {
                  const grade = formatGrade(student.grade, student.grade_year);
                  if (grade && student.school_name) return `כיתה ${grade} · ${student.school_name}`;
                  if (grade) return `כיתה ${grade}`;
                  if (student.school_name) return student.school_name;
                  return "ללא כיתה";
                })()}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
