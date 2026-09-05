"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTutor } from "@/lib/auth/require-tutor";
import { fromAppTime } from "@/lib/dates/timezone";

const blockSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
    all_day: z.boolean(),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "שעת התחלה לא תקינה").optional(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "שעת סיום לא תקינה").optional(),
    recurrence: z.enum(["none", "weekly"]),
    note: z.string().trim().nullable(),
  })
  .refine((v) => v.all_day || (v.start_time && v.end_time && v.end_time > v.start_time), {
    message: "שעת הסיום חייבת להיות אחרי שעת ההתחלה",
    path: ["end_time"],
  });

export async function createAvailabilityBlock(formData: FormData) {
  const { supabase } = await requireTutor();

  const allDay = formData.get("all_day") === "on";

  const input = blockSchema.parse({
    date: formData.get("date"),
    all_day: allDay,
    start_time: allDay ? undefined : formData.get("start_time"),
    end_time: allDay ? undefined : formData.get("end_time"),
    recurrence: formData.get("recurrence") || "none",
    note: (formData.get("note") as string) || null,
  });

  const startLocal = new Date(`${input.date}T${allDay ? "00:00" : input.start_time}:00`);
  const endLocal = new Date(`${input.date}T${allDay ? "23:59" : input.end_time}:00`);

  const { error } = await supabase.from("availability_blocks").insert({
    start_at: fromAppTime(startLocal).toISOString(),
    end_at: fromAppTime(endLocal).toISOString(),
    recurrence_rule: input.recurrence === "weekly" ? "weekly" : null,
    note: input.note,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/tutor/availability");
  revalidatePath("/tutor/calendar");
}

export async function deleteAvailabilityBlock(blockId: string) {
  const { supabase } = await requireTutor();

  const { error } = await supabase.from("availability_blocks").delete().eq("id", blockId);
  if (error) throw new Error(error.message);

  revalidatePath("/tutor/availability");
  revalidatePath("/tutor/calendar");
}

const additionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "שעת התחלה לא תקינה"),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "שעת סיום לא תקינה"),
    note: z.string().trim().nullable(),
  })
  .refine((v) => v.end_time > v.start_time, {
    message: "שעת הסיום חייבת להיות אחרי שעת ההתחלה",
    path: ["end_time"],
  });

/** One row per date - upserting on conflict means setting a new addition
 * for a date that already has one simply replaces it, rather than erroring
 * on the table's unique(date) constraint. */
export async function createAvailabilityAddition(formData: FormData) {
  const { supabase } = await requireTutor();

  const input = additionSchema.parse({
    date: formData.get("date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    note: (formData.get("note") as string) || null,
  });

  const { error } = await supabase.from("availability_additions").upsert(
    {
      date: input.date,
      start_time: input.start_time,
      end_time: input.end_time,
      note: input.note,
    },
    { onConflict: "date" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/tutor/availability");
  revalidatePath("/tutor/calendar");
}

export async function deleteAvailabilityAddition(additionId: string) {
  const { supabase } = await requireTutor();

  const { error } = await supabase.from("availability_additions").delete().eq("id", additionId);
  if (error) throw new Error(error.message);

  revalidatePath("/tutor/availability");
  revalidatePath("/tutor/calendar");
}
