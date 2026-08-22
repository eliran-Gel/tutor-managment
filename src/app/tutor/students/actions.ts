"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTutor } from "@/lib/auth/require-tutor";
import { currentSchoolYear } from "@/lib/grades";

const studentInputSchema = z.object({
  display_name: z.string().trim().min(1, "שם נדרש"),
  grade: z.coerce.number().int().min(1).max(12).nullable(),
  school_name: z.string().trim().min(1).nullable(),
});

function readStudentInput(formData: FormData) {
  const parsed = studentInputSchema.parse({
    display_name: formData.get("display_name"),
    grade: (formData.get("grade") as string) || null,
    school_name: (formData.get("school_name") as string) || null,
  });
  return {
    display_name: parsed.display_name,
    grade: parsed.grade,
    grade_year: parsed.grade != null ? currentSchoolYear() : null,
    school_name: parsed.school_name,
  };
}

export async function createStudent(formData: FormData) {
  const { supabase } = await requireTutor();
  const input = readStudentInput(formData);

  const { error } = await supabase.from("students").insert({ ...input, is_guest: true });
  if (error) throw new Error(error.message);

  revalidatePath("/tutor/students");
}

export async function updateStudent(studentId: string, formData: FormData) {
  const { supabase } = await requireTutor();
  const input = readStudentInput(formData);

  const { error } = await supabase.from("students").update(input).eq("id", studentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/tutor/students/${studentId}`);
  revalidatePath("/tutor/students");
}

export async function setStudentArchived(studentId: string, archived: boolean) {
  const { supabase } = await requireTutor();

  const { error } = await supabase
    .from("students")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", studentId);
  if (error) throw new Error(error.message);

  revalidatePath("/tutor/students");
  revalidatePath(`/tutor/students/${studentId}`);
}

const notesSchema = z.object({
  notes: z.string().trim().nullable(),
  rating: z.coerce.number().int().min(1).max(5).nullable(),
});

export async function upsertInternalNotes(studentId: string, formData: FormData) {
  const { supabase, userId } = await requireTutor();
  const input = notesSchema.parse({
    notes: (formData.get("notes") as string) || null,
    rating: (formData.get("rating") as string) || null,
  });

  const { error } = await supabase.from("student_internal_notes").upsert(
    { student_id: studentId, ...input, updated_by: userId },
    { onConflict: "student_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/tutor/students/${studentId}`);
}

const emailSchema = z.string().trim().toLowerCase().email("כתובת אימייל לא תקינה");

async function findProfileByEmail(
  supabase: Awaited<ReturnType<typeof requireTutor>>["supabase"],
  email: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function linkParentByEmail(studentId: string, formData: FormData) {
  const { supabase } = await requireTutor();
  const email = emailSchema.parse(formData.get("email"));

  const profile = await findProfileByEmail(supabase, email);
  if (!profile) {
    return {
      error: `לא נמצא משתמש רשום עם האימייל ${email}. יש לבקש מההורה להתחבר פעם אחת למערכת ולנסות שוב.`,
    };
  }

  if (profile.role === "student") {
    const { error: roleErr } = await supabase
      .from("profiles")
      .update({ role: "parent" })
      .eq("id", profile.id);
    if (roleErr) throw new Error(roleErr.message);
  }

  const { error: linkErr } = await supabase
    .from("parent_students")
    .insert({ parent_profile_id: profile.id, student_id: studentId });
  if (linkErr) {
    if (linkErr.code === "23505") return { error: "ההורה כבר מקושר לתלמיד/ה זה." };
    throw new Error(linkErr.message);
  }

  revalidatePath(`/tutor/students/${studentId}`);
  return { success: true as const };
}

export async function unlinkParent(parentStudentId: string, studentId: string) {
  const { supabase } = await requireTutor();
  const { error } = await supabase.from("parent_students").delete().eq("id", parentStudentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/tutor/students/${studentId}`);
}

export async function claimGuestByEmail(studentId: string, formData: FormData) {
  const { supabase } = await requireTutor();
  const email = emailSchema.parse(formData.get("email"));

  const profile = await findProfileByEmail(supabase, email);
  if (!profile) {
    return {
      error: `לא נמצא משתמש רשום עם האימייל ${email}. יש לבקש מהתלמיד/ה להתחבר פעם אחת למערכת ולנסות שוב.`,
    };
  }

  const { error: updateErr } = await supabase
    .from("students")
    .update({ profile_id: profile.id, is_guest: false, claimed_at: new Date().toISOString() })
    .eq("id", studentId);

  if (updateErr) {
    if (updateErr.code === "23505") return { error: "המשתמש הזה כבר מקושר לתלמיד/ה אחר/ת במערכת." };
    throw new Error(updateErr.message);
  }

  revalidatePath(`/tutor/students/${studentId}`);
  return { success: true as const };
}
