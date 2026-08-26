import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedFileUrl } from "@/lib/lesson-files";
import { Card } from "@/components/ui/card";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";

export default async function TutorSummariesPage() {
  const supabase = await createClient();
  const { data: summaries } = await supabase
    .from("lesson_summaries")
    .select("id, storage_path, lessons(id, date, subjects(name))")
    .order("created_at", { ascending: false })
    .limit(60);

  const withUrls = await Promise.all(
    (summaries ?? []).map(async (s) => ({ ...s, signedUrl: await getSignedFileUrl(s.storage_path) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">סיכומי שיעורים</h1>
        <p className="text-sm text-text-secondary">כל תמונות הסיכום שהועלו, מהחדש לישן.</p>
      </div>

      {withUrls.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">עדיין לא הועלו סיכומי שיעור.</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {withUrls.map((s) => (
          <Link key={s.id} href={s.lessons ? `/tutor/lessons/${s.lessons.id}` : "#"} className="flex flex-col gap-1.5">
            {s.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.signedUrl} alt="סיכום שיעור" className="aspect-square w-full rounded-control border border-border object-cover" />
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
          </Link>
        ))}
      </div>
    </div>
  );
}
