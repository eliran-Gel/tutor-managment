"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const joinWaitlistSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  subject_id: z.string().uuid("יש לבחור מקצוע"),
  note: z.string().trim().nullable(),
});

function revalidateWaitlistPaths() {
  revalidatePath("/portal/lessons");
  revalidatePath("/portal/dashboard");
  revalidatePath("/tutor/requests");
}

export async function joinWaitlist(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "יש להתחבר למערכת" };

  const parsed = joinWaitlistSchema.safeParse({
    date: formData.get("date"),
    subject_id: formData.get("subject_id"),
    note: (formData.get("note") as string) || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  const input = parsed.data;

  const requestedDate = new Date(`${input.date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (requestedDate < today) return { error: "לא ניתן להצטרף לרשימת המתנה לתאריך בעבר" };

  const { error } = await supabase.rpc("join_waitlist", {
    p_date: input.date,
    p_subject_id: input.subject_id,
    p_note: input.note ?? "",
  });
  if (error) return { error: error.message };

  revalidateWaitlistPaths();
  return { success: true as const };
}

export async function leaveWaitlist(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "יש להתחבר למערכת" };

  const { error } = await supabase.from("waitlist_entries").delete().eq("id", id).eq("created_by", user.id);
  if (error) return { error: error.message };

  revalidateWaitlistPaths();
  return { success: true as const };
}
