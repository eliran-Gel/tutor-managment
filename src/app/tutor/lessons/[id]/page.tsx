import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedFileUrl } from "@/lib/lesson-files";
import { LESSON_STATUS_LABELS, LESSON_STATUS_TONE, DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkPaymentControl } from "@/components/mark-payment-control";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";
import { HomeworkSection } from "./homework-section";
import { LessonFilesSection } from "./lesson-files-section";

export default async function TutorLessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lesson }, { data: homework }, { data: files }] = await Promise.all([
    supabase
      .from("lessons")
      .select(
        "id, date, start_time, end_time, status, delivery_mode, topic, subjects(name), lesson_participants(id, student_id, price_charged, payment_status, payment_method, cancellation_note, students(display_name))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("homework").select("id, student_id, description, due_date, is_done").eq("lesson_id", id).order("created_at"),
    supabase
      .from("lesson_files")
      .select("id, file_name, storage_path, mime_type, visible_to_students")
      .eq("lesson_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!lesson) notFound();

  const participants = lesson.lesson_participants
    .filter((lp) => lp.students)
    .map((lp) => ({ student_id: lp.student_id, display_name: lp.students!.display_name }));

  const filesWithUrls = await Promise.all(
    (files ?? []).map(async (f) => ({ ...f, signedUrl: await getSignedFileUrl(f.storage_path) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/tutor/calendar"
          className="inline-block text-sm font-medium text-text-secondary transition-transform duration-200 hover:text-text-primary active:scale-90"
        >
          ‹ חזרה ליומן
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold font-display text-text-primary">
            {formatIsoDateWithWeekday(lesson.date)} · {lesson.start_time.slice(0, 5)}–{lesson.end_time.slice(0, 5)} ·{" "}
            {lesson.subjects?.name ?? "שיעור"}
          </h1>
          <Badge tone={LESSON_STATUS_TONE[lesson.status]}>{LESSON_STATUS_LABELS[lesson.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {participants.map((p) => p.display_name).join(", ") || "ללא תלמיד/ה משויכ/ת"} ·{" "}
          {DELIVERY_MODE_LABELS[lesson.delivery_mode]}
          {lesson.topic && ` · ${lesson.topic}`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>תשלום</CardTitle>
        </CardHeader>
        {lesson.lesson_participants.length === 0 ? (
          <p className="text-sm text-text-muted">אין משתתפים משויכים עדיין.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {lesson.lesson_participants.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{p.students?.display_name ?? "תלמיד/ה"}</p>
                  <p className="text-sm text-text-muted">₪{p.price_charged}</p>
                  {p.cancellation_note && <p className="mt-0.5 text-xs text-status-destructive">{p.cancellation_note}</p>}
                </div>
                <MarkPaymentControl
                  participantId={p.id}
                  lessonId={id}
                  paymentStatus={p.payment_status}
                  paymentMethod={p.payment_method}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <HomeworkSection lessonId={id} participants={participants} homework={homework ?? []} />
      <LessonFilesSection lessonId={id} files={filesWithUrls} />
    </div>
  );
}
