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

/**
 * Same as getSignedFileUrl for many files at once, in ONE request instead of
 * one per file - the per-file version is fine for a handful of files, but a
 * page listing dozens or hundreds of them (every student's summaries on the
 * tutor's overview) would otherwise make that many round trips on every
 * load. Returns URLs in the same order as `storagePaths` (null where a file
 * couldn't be signed).
 */
export async function getSignedFileUrls(storagePaths: string[]): Promise<(string | null)[]> {
  if (storagePaths.length === 0) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("lesson-files")
    .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return storagePaths.map(() => null);
  return storagePaths.map((_, i) => data[i]?.signedUrl ?? null);
}
