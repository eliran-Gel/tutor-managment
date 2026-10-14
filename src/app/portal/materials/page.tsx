import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getSelectedChild } from "@/lib/portal/get-selected-child";
import { getSignedFileUrls } from "@/lib/lesson-files";
import { Card } from "@/components/ui/card";
import { MaterialsList } from "./materials-list";

export default async function PortalMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { child: requestedChild } = await searchParams;
  const { current } = await getSelectedChild(supabase, profile, requestedChild);

  // lesson_files has no student_id of its own (shared per-lesson, across
  // every participant of a group lesson) - the double embed checks
  // whether the selected child was one of that lesson's participants.
  const { data: materials } = current
    ? await supabase
        .from("lesson_files")
        .select("id, file_name, storage_path, mime_type, lessons!inner(date, subjects(name), lesson_participants!inner(student_id))")
        .not("mime_type", "ilike", "image/%")
        .eq("lessons.lesson_participants.student_id", current.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Files the tutor shared outside of a lesson: with everyone, or with this
  // child specifically. Filtered by the selected child explicitly - a parent
  // with two children can see both children's recipient rows through RLS,
  // and must not see one child's private file on the other's page.
  const [{ data: everyoneRows }, { data: ownRows }] = current
    ? await Promise.all([
        supabase.from("materials").select("id, file_name, storage_path, mime_type, created_at").eq("all_students", true),
        supabase
          .from("material_recipients")
          .select("materials(id, file_name, storage_path, mime_type, created_at)")
          .eq("student_id", current.id),
      ])
    : [{ data: [] }, { data: [] }];
  const personalById = new Map<string, { id: string; file_name: string; storage_path: string; mime_type: string; created_at: string }>();
  for (const m of [...(everyoneRows ?? []), ...(ownRows ?? []).map((r) => r.materials)]) {
    if (m) personalById.set(m.id, m);
  }
  const personal = Array.from(personalById.values());

  // One signing request for every file on the page, not one per file.
  const allUrls = await getSignedFileUrls([
    ...(materials ?? []).map((m) => m.storage_path),
    ...(personal ?? []).map((f) => f.storage_path),
  ]);
  const lessonMaterials = (materials ?? []).map((m, i) => ({
    id: m.id,
    file_name: m.file_name,
    mime_type: m.mime_type,
    lessons: { date: m.lessons.date, subjects: m.lessons.subjects },
    signedUrl: allUrls[i],
    sortKey: m.lessons.date,
  }));
  const personalOffset = (materials ?? []).length;
  const personalMaterials = (personal ?? []).map((f, i) => ({
    id: f.id,
    file_name: f.file_name,
    mime_type: f.mime_type,
    lessons: null,
    signedUrl: allUrls[personalOffset + i],
    sortKey: f.created_at.slice(0, 10),
  }));
  const withUrls = [...personalMaterials, ...lessonMaterials].sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">חומרי עזר</h1>
        <p className="text-sm text-text-secondary">
          {profile?.role === "parent" && current
            ? `קבצים שהמורה שיתף/ה עם ${current.display_name}.`
            : "קבצים שהמורה שיתף/ה איתך."}
        </p>
      </div>

      {withUrls.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">אין עדיין חומרי עזר.</p>
        </Card>
      )}

      <MaterialsList materials={withUrls} />
    </div>
  );
}
