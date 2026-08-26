"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTutor } from "@/lib/auth/require-tutor";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function revalidateLessonFilePaths(lessonId: string) {
  revalidatePath(`/tutor/lessons/${lessonId}`);
  revalidatePath("/tutor/homework");
  revalidatePath("/tutor/summaries");
  revalidatePath("/portal/homework");
  revalidatePath("/portal/summaries");
  revalidatePath("/portal/materials");
}

const assignHomeworkSchema = z.object({
  lesson_id: z.string().uuid(),
  student_ids: z.array(z.string().uuid()).min(1, "יש לבחור לפחות תלמיד/ה אחד/ת"),
  description: z.string().trim().min(1, "יש לכתוב תיאור"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function assignHomework(input: {
  lesson_id: string;
  student_ids: string[];
  description: string;
  due_date: string | null;
}) {
  const { supabase } = await requireTutor();
  const parsed = assignHomeworkSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  const data = parsed.data;

  const { error } = await supabase.from("homework").insert(
    data.student_ids.map((student_id) => ({
      lesson_id: data.lesson_id,
      student_id,
      description: data.description,
      due_date: data.due_date,
    })),
  );
  if (error) return { error: error.message };

  revalidateLessonFilePaths(data.lesson_id);
  return { success: true as const };
}

export async function deleteHomework(id: string, lessonId: string) {
  const { supabase } = await requireTutor();
  const { error } = await supabase.from("homework").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateLessonFilePaths(lessonId);
  return { success: true as const };
}

export async function uploadLessonFile(lessonId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "יש לבחור קובץ" };
  if (file.size > MAX_FILE_BYTES) return { error: "הקובץ גדול מדי (מקסימום 10MB)" };

  const { supabase } = await requireTutor();
  const storagePath = `${lessonId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("lesson-files").upload(storagePath, file);
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("lesson_files").insert({
    lesson_id: lessonId,
    file_name: file.name,
    storage_path: storagePath,
    mime_type: file.type || "application/octet-stream",
    visible_to_students: true,
  });
  if (error) return { error: error.message };

  revalidateLessonFilePaths(lessonId);
  return { success: true as const };
}

export async function toggleFileVisibility(id: string, visible: boolean, lessonId: string) {
  const { supabase } = await requireTutor();
  const { error } = await supabase.from("lesson_files").update({ visible_to_students: visible }).eq("id", id);
  if (error) return { error: error.message };
  revalidateLessonFilePaths(lessonId);
  return { success: true as const };
}

export async function deleteLessonFile(id: string, storagePath: string, lessonId: string) {
  const { supabase } = await requireTutor();
  await supabase.storage.from("lesson-files").remove([storagePath]);
  const { error } = await supabase.from("lesson_files").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateLessonFilePaths(lessonId);
  return { success: true as const };
}
