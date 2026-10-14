import { createClient } from "@/lib/supabase/server";
import { getSignedFileUrls } from "@/lib/lesson-files";
import { SummariesBrowser, type StudentSummaries } from "./summaries-browser";

export default async function TutorSummariesPage() {
  const supabase = await createClient();

  const [{ data: students }, { data: lessons, error }] = await Promise.all([
    supabase.from("students").select("id, display_name").is("archived_at", null).order("display_name"),
    supabase
      .from("lessons")
      .select(
        "id, date, start_time, subjects(name), lesson_participants(student_id), lesson_files(id, file_name, storage_path, mime_type)",
      )
      .eq("status", "confirmed")
      .order("date", { ascending: false }),
  ]);

  // Every summary image of every lesson, signed in a single request - this
  // page lists all students' lessons at once, so one request per image
  // would grow with the whole business, not with one student.
  const imageFilesByLesson = (lessons ?? []).map((lesson) =>
    lesson.lesson_files.filter((f) => f.mime_type.startsWith("image/")),
  );
  const imageUrls = await getSignedFileUrls(imageFilesByLesson.flat().map((f) => f.storage_path));
  let urlCursor = 0;
  const lessonsWithUrls = (lessons ?? []).map((lesson, lessonIndex) => {
    const summaryFiles = imageFilesByLesson[lessonIndex].map((f) => ({ ...f, signedUrl: imageUrls[urlCursor++] }));
    return { ...lesson, summaryFiles };
  });

  const studentSummaries: StudentSummaries[] = (students ?? []).map((student) => ({
    id: student.id,
    displayName: student.display_name,
    lessons: lessonsWithUrls
      .filter((lesson) => lesson.lesson_participants.some((p) => p.student_id === student.id))
      .map((lesson) => ({
        id: lesson.id,
        date: lesson.date,
        startTime: lesson.start_time,
        subjectName: lesson.subjects?.name ?? "שיעור",
        summaryFiles: lesson.summaryFiles,
      })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">סיכומי שיעורים</h1>
        <p className="text-sm text-text-secondary">בחרו תלמיד/ה כדי לראות את השיעורים שאושרו ולפתוח את הסיכום שלהם.</p>
      </div>

      {error && <p className="text-sm text-status-destructive">שגיאה בטעינת הנתונים: {error.message}</p>}

      <SummariesBrowser students={studentSummaries} />
    </div>
  );
}
