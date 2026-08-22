import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { LESSON_STATUS_LABELS, LESSON_STATUS_TONE, DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { formatIsoDate } from "@/lib/dates/format";
import { RequestLessonModal } from "./request-lesson-modal";

export default async function PortalLessonsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: lessons }, { data: subjects }] = await Promise.all([
    supabase
      .from("lessons")
      .select("*, subjects(name)")
      .order("date", { ascending: false })
      .order("start_time", { ascending: false }),
    supabase.from("subjects").select("*").eq("active", true).order("name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">השיעורים שלי</h1>
          <p className="text-sm text-text-secondary">כל הבקשות והשיעורים המתוזמנים</p>
        </div>
        {profile?.role === "student" && <RequestLessonModal subjects={subjects ?? []} />}
      </div>

      {lessons && lessons.length === 0 && (
        <Card>
          <p className="text-sm text-text-muted">אין עדיין שיעורים או בקשות.</p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {lessons?.map((lesson) => (
          <Card key={lesson.id} className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words font-medium text-text-primary">{lesson.subjects?.name ?? "ללא מקצוע"}</p>
              <Badge tone={LESSON_STATUS_TONE[lesson.status]}>
                {LESSON_STATUS_LABELS[lesson.status]}
              </Badge>
            </div>
            <p className="mt-1 break-words text-sm text-text-muted">
              {formatIsoDate(lesson.date)} ·{" "}
              {lesson.start_time.slice(0, 5)}–{lesson.end_time.slice(0, 5)} ·{" "}
              {DELIVERY_MODE_LABELS[lesson.delivery_mode]}
            </p>
            {lesson.topic && <p className="mt-1 break-words text-sm text-text-secondary">{lesson.topic}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
