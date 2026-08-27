import { createClient } from "@/lib/supabase/server";
import { getSignedFileUrl } from "@/lib/lesson-files";
import { Card } from "@/components/ui/card";
import { SummariesGallery } from "./summaries-gallery";

export default async function PortalSummariesPage() {
  const supabase = await createClient();
  const { data: summaries } = await supabase
    .from("lesson_files")
    .select("id, file_name, storage_path, mime_type, lessons(date, subjects(name))")
    .ilike("mime_type", "image/%")
    .order("created_at", { ascending: false });

  const withUrls = await Promise.all(
    (summaries ?? []).map(async (s) => ({ ...s, signedUrl: await getSignedFileUrl(s.storage_path) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">סיכומי שיעור</h1>
        <p className="text-sm text-text-secondary">תמונות הסיכום מהשיעורים שלך.</p>
      </div>

      {withUrls.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">אין עדיין סיכומי שיעור.</p>
        </Card>
      )}

      <SummariesGallery summaries={withUrls} />
    </div>
  );
}
