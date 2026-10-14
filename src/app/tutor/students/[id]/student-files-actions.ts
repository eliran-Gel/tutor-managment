"use server";

import { revalidatePath } from "next/cache";
import { requireTutor } from "@/lib/auth/require-tutor";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Same reason as the lesson upload (see tutor/lessons/[id]/actions.ts):
// bucket keys must be plain ASCII-safe, while the name people see is stored
// separately in file_name.
function safeStorageSegment(name: string) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const safeBase =
    base
      .normalize("NFKD")
      .replace(/[^\w-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "file";
  const safeExt = ext.replace(/[^\w.]/g, "");
  return safeBase + safeExt;
}

function revalidateStudentFilePaths(studentId: string) {
  revalidatePath(`/tutor/students/${studentId}`);
  revalidatePath("/portal/materials");
}

/** File bytes never pass through a Server Action (Vercel caps those at
 * 4.5MB) - this hands the browser a short-lived upload URL after checking
 * the caller is the tutor, then addStudentFile records the row. */
export async function createStudentFileTicket(studentId: string, fileName: string, fileSize: number) {
  if (fileSize > MAX_FILE_BYTES) return { error: "הקובץ גדול מדי (מקסימום 10MB)" };

  const { supabase } = await requireTutor();
  const storagePath = `students/${studentId}/${crypto.randomUUID()}-${safeStorageSegment(fileName)}`;
  const { data, error } = await supabase.storage.from("lesson-files").createSignedUploadUrl(storagePath);
  if (error) return { error: error.message };
  return { storagePath, token: data.token };
}

export async function addStudentFile(studentId: string, storagePath: string, fileName: string, mimeType: string) {
  const { supabase } = await requireTutor();
  const { error } = await supabase.rpc("add_student_file", {
    p_student_id: studentId,
    p_storage_path: storagePath,
    p_file_name: fileName,
    p_mime_type: mimeType || "application/octet-stream",
  });
  if (error) return { error: error.message };
  revalidateStudentFilePaths(studentId);
  return { success: true as const };
}

export async function toggleStudentFileVisibility(id: string, visible: boolean, studentId: string) {
  const { supabase } = await requireTutor();
  const { error } = await supabase.from("student_files").update({ visible_to_students: visible }).eq("id", id);
  if (error) return { error: error.message };
  revalidateStudentFilePaths(studentId);
  return { success: true as const };
}

export async function deleteStudentFile(id: string, storagePath: string, studentId: string) {
  const { supabase } = await requireTutor();
  await supabase.storage.from("lesson-files").remove([storagePath]);
  const { error } = await supabase.from("student_files").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateStudentFilePaths(studentId);
  return { success: true as const };
}
