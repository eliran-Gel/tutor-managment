import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getSelectedChild } from "@/lib/portal/get-selected-child";
import { getSignedFileUrls } from "@/lib/lesson-files";
import { Card } from "@/components/ui/card";
import { SummariesGallery } from "./summaries-gallery";

export default async function PortalSummariesPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { child: requestedChild } = await searchParams;
  const { current } = await getSelectedChild(supabase, profile, requestedChild);

  const { data: summaries } = current
    ? await supabase
        .from("lesson_files")
        .select("id, file_name, storage_path, mime_type, lessons!inner(date, subjects(name), lesson_participants!inner(student_id))")
        .ilike("mime_type", "image/%")
        .eq("lessons.lesson_participants.student_id", current.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const summaryUrls = await getSignedFileUrls((summaries ?? []).map((s) => s.storage_path));
  const withUrls = (summaries ?? []).map((s, i) => ({ ...s, signedUrl: summaryUrls[i] }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">סיכומי שיעור</h1>
        <p className="text-sm text-text-secondary">
          {profile?.role === "parent" && current
            ? `תמונות הסיכום מהשיעורים של ${current.display_name}.`
            : "תמונות הסיכום מהשיעורים שלך."}
        </p>
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
