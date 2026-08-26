import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedFileUrl } from "@/lib/lesson-files";
import { LESSON_STATUS_LABELS, LESSON_STATUS_TONE, DELIVERY_MODE_LABELS } from "@/lib/lessons";
import { Badge } from "@/components/ui/badge";
import { formatIsoDateWithWeekday } from "@/lib/dates/format";
import { HomeworkSection } from "./homework-section";
import { SummarySection } from "./summary-section";
import { MaterialsSection } from "./materials-section";

export default async function TutorLessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lesson }, { data: homework }, { data: summaries }, { data: materials }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, date, start_time, end_time, status, delivery_mode, topic, subjects(name), lesson_participants(student_id, students(display_name))")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("homework").select("id, student_id, description, due_date, is_done").eq("lesson_id", id).order("created_at"),
    supabase.from("lesson_summaries").select("id, storage_path").eq("lesson_id", id).order("created_at", { ascending: false }),
    supabase.from("lesson_materials").select("id, file_name, storage_path, visible_to_students").eq("lesson_id", id).order("created_at", { ascending: false }),
  ]);

  if (!lesson) notFound();

  const participants = lesson.lesson_participants
    .filter((lp) => lp.students)
    .map((lp) => ({ student_id: lp.student_id, display_name: lp.students!.display_name }));

  const summariesWithUrls = await Promise.all(
    (summaries ?? []).map(async (s) => ({ ...s, signedUrl: await getSignedFileUrl(s.storage_path) })),
  );
  const materialsWithUrls = await Promise.all(
    (materials ?? []).map(async (m) => ({ ...m, signedUrl: await getSignedFileUrl(m.storage_path) })),
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
          <h1 className="text-xl font-bold text-text-primary">
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

      <HomeworkSection lessonId={id} participants={participants} homework={homework ?? []} />
      <SummarySection lessonId={id} summaries={summariesWithUrls} />
      <MaterialsSection lessonId={id} materials={materialsWithUrls} />
    </div>
  );
}
