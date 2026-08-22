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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary">{student.display_name}</h1>
          {student.is_guest && <Badge tone="pending">אורח/ת</Badge>}
          {student.archived_at && <Badge tone="destructive">בארכיון</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <ArchiveButton studentId={student.id} archived={Boolean(student.archived_at)} />
          <DeleteStudentButton studentId={student.id} studentName={student.display_name} />
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
          <ParentLinksCard studentId={student.id} links={parentLinks ?? []} />
        </div>
      </div>

      <InternalNotesCard studentId={student.id} notes={notes ?? null} />
    </div>
  );
}
