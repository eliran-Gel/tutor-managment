import { createClient } from "@/lib/supabase/client";
import { createMaterial, createMaterialTicket } from "./actions";
import type { Share } from "./recipient-picker";

/** Browser-side upload flow shared by the materials page and a student's
 * own card: ticket (authorized server-side) -> straight to Storage ->
 * record + share. Returns an error message, or null on success. */
export async function uploadMaterialFile(file: File, share: Share): Promise<string | null> {
  try {
    const ticket = await createMaterialTicket(file.name, file.size);
    const storagePath = "storagePath" in ticket ? ticket.storagePath : undefined;
    const token = "token" in ticket ? ticket.token : undefined;
    if (!storagePath || !token) {
      return "error" in ticket && ticket.error ? ticket.error : "לא ניתן היה להתחיל את ההעלאה";
    }

    const { error: uploadError } = await createClient().storage
      .from("lesson-files")
      .uploadToSignedUrl(storagePath, token, file);
    if (uploadError) return uploadError.message;

    const result = await createMaterial(storagePath, file.name, file.type, share);
    if ("error" in result && result.error) return result.error;
    return null;
  } catch {
    return "ההעלאה נכשלה - נסה/י שוב, ייתכן שהחיבור לאינטרנט לא יציב.";
  }
}
