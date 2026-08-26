import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 300;

/**
 * Mints a short-lived signed URL for a private lesson-files object. The
 * real access check already happened when the caller was able to SELECT
 * the lesson_summaries/lesson_materials row that carries this path (RLS
 * on those tables, not on storage.objects, is the security boundary) -
 * this just needs the service role to actually read the private bucket.
 */
export async function getSignedFileUrl(storagePath: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("lesson-files")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}
