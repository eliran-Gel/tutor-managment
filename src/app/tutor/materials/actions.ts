"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTutor } from "@/lib/auth/require-tutor";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Bucket keys have to be plain ASCII-safe; the name people see is stored
// separately in file_name (same reason as the lesson upload).
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
  return safeBase + ext.replace(/[^\w.]/g, "");
}

function revalidateMaterialPaths() {
  revalidatePath("/tutor/materials");
  revalidatePath("/tutor/students/[id]", "page");
  revalidatePath("/portal/materials");
}

/** File bytes never pass through a Server Action (Vercel caps those at
 * 4.5MB) - this hands the browser a short-lived upload URL after checking
 * the caller is the tutor; createMaterial then records the row. */
export async function createMaterialTicket(fileName: string, fileSize: number) {
  if (fileSize > MAX_FILE_BYTES) return { error: "הקובץ גדול מדי (מקסימום 10MB)" };

  const { supabase } = await requireTutor();
  const storagePath = `materials/${crypto.randomUUID()}-${safeStorageSegment(fileName)}`;
  const { data, error } = await supabase.storage.from("lesson-files").createSignedUploadUrl(storagePath);
  if (error) return { error: error.message };
  return { storagePath, token: data.token };
}

const shareSchema = z.object({
  all: z.boolean(),
  studentIds: z.array(z.string().uuid()),
});

export async function createMaterial(
  storagePath: string,
  fileName: string,
  mimeType: string,
  share: { all: boolean; studentIds: string[] },
) {
  const parsed = shareSchema.safeParse(share);
  if (!parsed.success) return { error: "פרטי שיתוף לא תקינים" };
  if (!parsed.data.all && parsed.data.studentIds.length === 0) {
    return { error: "יש לבחור לפחות תלמיד/ה אחד/ת, או לשתף עם כולם" };
  }

  const { supabase } = await requireTutor();
  const { error } = await supabase.rpc("create_material", {
    p_storage_path: storagePath,
    p_file_name: fileName,
    p_mime_type: mimeType || "application/octet-stream",
    p_all: parsed.data.all,
    p_student_ids: parsed.data.studentIds,
  });
  if (error) return { error: error.message };

  revalidateMaterialPaths();
  return { success: true as const };
}

export async function setMaterialRecipients(
  materialId: string,
  share: { all: boolean; studentIds: string[] },
) {
  const parsed = shareSchema.safeParse(share);
  if (!parsed.success) return { error: "פרטי שיתוף לא תקינים" };
  if (!parsed.data.all && parsed.data.studentIds.length === 0) {
    return { error: "יש לבחור לפחות תלמיד/ה אחד/ת, או לשתף עם כולם. כדי להפסיק לשתף לגמרי - למחוק את הקובץ." };
  }

  const { supabase } = await requireTutor();
  const { error } = await supabase.rpc("set_material_recipients", {
    p_material_id: materialId,
    p_all: parsed.data.all,
    p_student_ids: parsed.data.studentIds,
  });
  if (error) return { error: error.message };

  revalidateMaterialPaths();
  return { success: true as const };
}

export async function deleteMaterial(id: string, storagePath: string) {
  const { supabase } = await requireTutor();
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) return { error: error.message };
  await supabase.storage.from("lesson-files").remove([storagePath]);

  revalidateMaterialPaths();
  return { success: true as const };
}
