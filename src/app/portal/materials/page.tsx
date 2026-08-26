import { createClient } from "@/lib/supabase/server";
import { getSignedFileUrl } from "@/lib/lesson-files";
import { Card } from "@/components/ui/card";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";

export default async function PortalMaterialsPage() {
  const supabase = await createClient();
  const { data: materials } = await supabase
    .from("lesson_files")
    .select("id, file_name, storage_path, lessons(date, subjects(name))")
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

      <div className="flex flex-col gap-2">
        {withUrls.map((m) => (
          <Card key={m.id} className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              {m.signedUrl ? (
                <a href={m.signedUrl} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-brand-accent hover:underline">
                  {m.file_name}
                </a>
              ) : (
                <span className="truncate text-sm text-text-muted">{m.file_name}</span>
              )}
              {m.lessons && (
                <p className="mt-0.5 truncate text-xs text-text-muted">
                  {m.lessons.subjects?.name ?? "שיעור"} · {formatIsoDateWithWeekday(m.lessons.date)}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
