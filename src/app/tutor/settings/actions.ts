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
