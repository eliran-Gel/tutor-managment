import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditStudentForm } from "./edit-student-form";
import { ArchiveButton } from "./archive-button";
import { DeleteStudentButton } from "./delete-student-button";
import { InternalNotesCard } from "./internal-notes-card";
import { ParentLinksCard } from "./parent-links-card";
import { ClaimGuestCard } from "./claim-guest-card";
import { LessonHistoryCard } from "./lesson-history-card";
import { GradesCard } from "./grades-card";
import { StudentFilesCard } from "./student-files-card";
import { getSignedFileUrls } from "@/lib/lesson-files";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("*").eq("id", id).single();
  if (!student) notFound();

  const { data: notes } = await supabase
    .from("student_internal_notes")
    .select("*")
    .eq("student_id", id)
    .maybeSingle();

  const { data: parentLinks } = await supabase
    .from("parent_students")
    .select("id, parent_profile_id, profiles:parent_profile_id (full_name, email)")
    .eq("student_id", id);

  // Materials this student can see: shared with everyone, or with them
  // specifically. (The tutor's RLS sees every material, so the filter has to
  // be explicit.)
  const [{ data: everyoneRows }, { data: ownRows }] = await Promise.all([
    supabase
      .from("materials")
      .select("id, file_name, storage_path, mime_type, all_students, created_at")
      .eq("all_students", true),
    supabase
      .from("material_recipients")
      .select("materials(id, file_name, storage_path, mime_type, all_students, created_at)")
      .eq("student_id", id),
  ]);
  const materialsById = new Map<string, NonNullable<typeof everyoneRows>[number]>();
  for (const m of [...(everyoneRows ?? []), ...(ownRows ?? []).map((r) => r.materials)]) {
    if (m) materialsById.set(m.id, m);
  }
  const studentMaterialRows = Array.from(materialsById.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const studentFileUrls = await getSignedFileUrls(studentMaterialRows.map((m) => m.storage_path));
  const studentFiles = studentMaterialRows.map((m, i) => ({
    id: m.id,
    file_name: m.file_name,
    mime_type: m.mime_type,
    all_students: m.all_students,
    signedUrl: studentFileUrls[i],
  }));

  const [{ data: subjects }, { data: grades }] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("active", true).order("name"),
    supabase
      .from("grades")
      .select("id, title, score, max_score, exam_date, note, subjects(name)")
      .eq("student_id", id)
      .order("exam_date", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="min-w-0 break-words text-xl font-bold font-display text-text-primary">{student.display_name}</h1>
          {student.is_guest && <Badge tone="pending" className="shrink-0">אורח/ת</Badge>}
          {student.archived_at && <Badge tone="destructive" className="shrink-0">בארכיון</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ArchiveButton studentId={student.id} archived={Boolean(student.archived_at)} />
          <DeleteStudentButton studentId={student.id} studentName={student.display_name} hasAccount={Boolean(student.profile_id)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>פרטים</CardTitle>
          </CardHeader>
          <EditStudentForm student={student} />
        </Card>

        <div className="flex flex-col gap-4">
          {student.is_guest && <ClaimGuestCard studentId={student.id} />}
          <ParentLinksCard studentId={student.id} studentName={student.display_name} links={parentLinks ?? []} />
        </div>
      </div>

      <LessonHistoryCard studentId={student.id} />

      <StudentFilesCard studentId={student.id} files={studentFiles} />

      <GradesCard studentId={student.id} subjects={subjects ?? []} grades={grades ?? []} />

      <InternalNotesCard studentId={student.id} notes={notes ?? null} />
    </div>
  );
}
