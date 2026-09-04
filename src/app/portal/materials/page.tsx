import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getSelectedChild } from "@/lib/portal/get-selected-child";
import { getSignedFileUrl } from "@/lib/lesson-files";
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

  const withUrls = await Promise.all(
    (materials ?? []).map(async (m) => ({ ...m, signedUrl: await getSignedFileUrl(m.storage_path) })),
  );

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
