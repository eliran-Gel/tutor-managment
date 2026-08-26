"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTutor } from "@/lib/auth/require-tutor";

function optionalUrl(field: string) {
  return z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), { message: `${field} חייב להתחיל ב-http:// או https://` })
    .transform((v) => v || null);
}

const businessLinksSchema = z.object({
  website_url: optionalUrl("קישור לאתר"),
  community_url: optionalUrl("קישור לקהילה"),
  contact_info: z.string().trim().nullable(),
  bit_link: optionalUrl("קישור ל-Bit"),
  paybox_link: optionalUrl("קישור ל-PayBox"),
});

export async function updateBusinessLinks(formData: FormData) {
  const { supabase } = await requireTutor();

  const input = businessLinksSchema.parse({
    website_url: formData.get("website_url"),
    community_url: formData.get("community_url"),
    contact_info: (formData.get("contact_info") as string) || null,
    bit_link: formData.get("bit_link"),
    paybox_link: formData.get("paybox_link"),
  });

  const { error } = await supabase.from("business_links").update(input).eq("id", true);
  if (error) throw new Error(error.message);

  revalidatePath("/tutor/settings");
  revalidatePath("/portal/dashboard");
}

const tutorSettingsSchema = z.object({
  payment_reminder_days: z.coerce.number().int().positive(),
  default_lesson_duration: z.coerce.number().int().positive(),
});

export async function updateTutorSettings(formData: FormData) {
  const { supabase } = await requireTutor();

  const input = tutorSettingsSchema.parse({
    payment_reminder_days: formData.get("payment_reminder_days"),
    default_lesson_duration: formData.get("default_lesson_duration"),
  });

  const { error } = await supabase.from("tutor_settings").update(input).eq("id", true);
  if (error) throw new Error(error.message);

  revalidatePath("/tutor/settings");
}

const subjectNameSchema = z.string().trim().min(1, "שם המקצוע נדרש");

export async function createSubject(formData: FormData) {
  const { supabase } = await requireTutor();
  const name = subjectNameSchema.parse(formData.get("name"));

  const { error } = await supabase.from("subjects").insert({ name });
  if (error) {
    if (error.code === "23505") throw new Error("מקצוע בשם הזה כבר קיים");
    throw new Error(error.message);
  }

  revalidatePath("/tutor/settings");
}

const workingHoursSchema = z
  .array(
    z.object({
      day_of_week: z.number().int().min(0).max(6),
      is_open: z.boolean(),
      start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
      end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    }),
  )
  .length(7)
  .refine(
    (rows) => rows.every((r) => !r.is_open || (r.start_time && r.end_time && r.end_time > r.start_time)),
    { message: "בכל יום פתוח, שעת הסיום חייבת להיות אחרי שעת ההתחלה" },
  );

export async function updateWorkingHours(
  rows: { day_of_week: number; is_open: boolean; start_time: string | null; end_time: string | null }[],
) {
  const { supabase } = await requireTutor();
  const input = workingHoursSchema.parse(rows);

  const { error } = await supabase.from("tutor_working_hours").upsert(
    input.map((r) => ({
      day_of_week: r.day_of_week,
      is_open: r.is_open,
      start_time: r.is_open ? r.start_time : null,
      end_time: r.is_open ? r.end_time : null,
    })),
  );
  if (error) throw new Error(error.message);

  revalidatePath("/tutor/settings");
}

export async function setSubjectActive(subjectId: string, active: boolean) {
  const { supabase } = await requireTutor();

  const { error } = await supabase.from("subjects").update({ active }).eq("id", subjectId);
  if (error) throw new Error(error.message);

  revalidatePath("/tutor/settings");
}
