import { createClient } from "@/lib/supabase/server";
import { getSignedFileUrl } from "@/lib/lesson-files";
import { Card } from "@/components/ui/card";
import { MaterialsList } from "./materials-list";

export default async function PortalMaterialsPage() {
  const supabase = await createClient();
  const { data: materials } = await supabase
    .from("lesson_files")
    .select("id, file_name, storage_path, mime_type, lessons(date, subjects(name))")
    .not("mime_type", "ilike", "image/%")
    .order("created_at", { ascending: false });

  const withUrls = await Promise.all(
    (materials ?? []).map(async (m) => ({ ...m, signedUrl: await getSignedFileUrl(m.storage_path) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">חומרי עזר</h1>
        <p className="text-sm text-text-secondary">קבצים שהמורה שיתף/ה איתך.</p>
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
