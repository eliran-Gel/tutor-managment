import { createClient } from "@/lib/supabase/server";
import { getSignedFileUrl } from "@/lib/lesson-files";
import { Card } from "@/components/ui/card";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";

export default async function PortalSummariesPage() {
  const supabase = await createClient();
  const { data: summaries } = await supabase
    .from("lesson_files")
    .select("id, storage_path, lessons(date, subjects(name))")
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {withUrls.map((s) => (
          <div key={s.id} className="flex flex-col gap-1.5">
            {s.signedUrl ? (
              <a href={s.signedUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.signedUrl} alt="סיכום שיעור" className="aspect-square w-full rounded-control border border-border object-cover" />
              </a>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-control border border-border bg-surface-muted text-xs text-text-muted">
                שגיאה בטעינה
              </div>
            )}
            {s.lessons && (
              <p className="truncate text-xs text-text-muted">
                {s.lessons.subjects?.name ?? "שיעור"} · {formatIsoDateWithWeekday(s.lessons.date)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
