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

  const { error } = await supabase.rpc("assign_homework", {
    p_lesson_id: data.lesson_id,
    p_student_ids: data.student_ids,
    p_description: data.description,
    // The generated RPC type doesn't reflect that this Postgres `date`
    // param has no NOT NULL constraint - it genuinely accepts null.
    p_due_date: data.due_date as string,
  });
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

/**
 * Server Actions' file bytes travel through the Vercel serverless function
 * boundary, which enforces a hard 4.5MB request-body ceiling no app config
 * can raise - a real phone photo blows past that easily, which is exactly
 * what caused the ~30s hang and crash. So uploads never go through a
 * Server Action at all: this mints a short-lived, path-scoped signed
 * upload URL (the tutor-only check happens here, server-side, before the
 * token is ever handed out), the browser uploads straight to Supabase
 * Storage with it, and confirmLessonFileUpload below - a tiny JSON call,
 * no file bytes - records the metadata row afterward.
 */
export async function createUploadTicket(lessonId: string, fileName: string, fileSize: number) {
  if (fileSize > MAX_FILE_BYTES) return { error: "הקובץ גדול מדי (מקסימום 10MB)" };

  const { supabase } = await requireTutor();
  const storagePath = `${lessonId}/${crypto.randomUUID()}-${fileName}`;
  const { data, error } = await supabase.storage.from("lesson-files").createSignedUploadUrl(storagePath);
  if (error) return { error: error.message };

  return { storagePath, token: data.token };
}

export async function confirmLessonFileUpload(
  lessonId: string,
  storagePath: string,
  fileName: string,
  mimeType: string,
) {
  const { supabase } = await requireTutor();
  const { error } = await supabase.rpc("confirm_lesson_file_upload", {
    p_lesson_id: lessonId,
    p_storage_path: storagePath,
    p_file_name: fileName,
    p_mime_type: mimeType || "application/octet-stream",
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
