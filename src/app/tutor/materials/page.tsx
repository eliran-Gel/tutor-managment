import { createClient } from "@/lib/supabase/server";
import { getSignedFileUrls } from "@/lib/lesson-files";
import { MaterialsManager, type ManagedMaterial } from "./materials-manager";

export default async function TutorMaterialsPage() {
  const supabase = await createClient();

  const [{ data: rows }, { data: students }] = await Promise.all([
    supabase
      .from("materials")
      .select("id, file_name, storage_path, mime_type, all_students, material_recipients(student_id)")
      .order("created_at", { ascending: false }),
    supabase.from("students").select("id, display_name").is("archived_at", null).order("display_name"),
  ]);

  const urls = await getSignedFileUrls((rows ?? []).map((r) => r.storage_path));
  const materials: ManagedMaterial[] = (rows ?? []).map((r, i) => ({
    id: r.id,
    file_name: r.file_name,
    storage_path: r.storage_path,
    mime_type: r.mime_type,
    all_students: r.all_students,
    recipientIds: r.material_recipients.map((x) => x.student_id),
    signedUrl: urls[i],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">חומרי עזר</h1>
        <p className="text-sm text-text-secondary">
          קבצים שאתה משתף עם תלמידים (וההורים שלהם), בלי קשר לשיעור. אפשר לשנות את השיתוף או למחוק בכל שלב.
        </p>
      </div>
      <MaterialsManager materials={materials} students={students ?? []} />
    </div>
  );
}
