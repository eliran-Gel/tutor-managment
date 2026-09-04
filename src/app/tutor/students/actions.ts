"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTutor } from "@/lib/auth/require-tutor";
import { currentSchoolYear } from "@/lib/grades";

const studentInputSchema = z.object({
  display_name: z.string().trim().min(1, "שם נדרש").max(40, "שם יכול להכיל עד 40 תווים"),
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

export async function deleteStudent(studentId: string) {
  const { supabase } = await requireTutor();

  const { error } = await supabase.rpc("delete_student", { p_student_id: studentId });
  if (error) return { error: error.message };

  revalidatePath("/tutor/students");
  revalidatePath("/tutor/calendar");
  return { success: true as const };
}

export async function deleteLessonFromHistory(lessonId: string, studentId: string) {
  const { supabase } = await requireTutor();

  const { error } = await supabase.rpc("delete_lesson_from_history", { target_lesson_id: lessonId });
  if (error) return { error: error.message };

  revalidatePath(`/tutor/students/${studentId}`);
  revalidatePath(`/tutor/students/${studentId}/history`);
  revalidatePath("/tutor/calendar");
  return { success: true as const };
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

    // A parent's account was created exactly like a student's - the
    // signup trigger has no way to know in advance who's going to become
    // a parent, so it always creates a self-students row. That row is now
    // a phantom nobody will ever use, but only clean it up if it truly
    // has no real data (never had a single lesson booked under it) -
    // better to leave a rare false-positive orphan than to ever silently
    // delete something real.
    const { data: ownStudentRow } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (ownStudentRow) {
      const { count } = await supabase
        .from("lesson_participants")
        .select("id", { count: "exact", head: true })
        .eq("student_id", ownStudentRow.id);
      if (!count) {
        await supabase.from("students").delete().eq("id", ownStudentRow.id);
      }
    }
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

const gradeSchema = z.object({
  student_id: z.string().uuid(),
  subject_id: z.string().uuid().nullable(),
  title: z.string().trim().min(1, "יש לכתוב כותרת (למשל: מבחן אמצע)"),
  score: z.coerce.number().min(0, "הציון לא יכול להיות שלילי"),
  max_score: z.coerce.number().positive("הציון המקסימלי חייב להיות חיובי").default(100),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  note: z.string().trim().nullable(),
});

export async function addGrade(input: {
  student_id: string;
  subject_id: string | null;
  title: string;
  score: number;
  max_score: number;
  exam_date: string;
  note: string | null;
}) {
  const { supabase } = await requireTutor();
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  const data = parsed.data;

  if (data.score > data.max_score) return { error: "הציון לא יכול להיות גבוה מהציון המקסימלי" };

  const { error } = await supabase.from("grades").insert(data);
  if (error) return { error: error.message };

  revalidatePath(`/tutor/students/${data.student_id}`);
  revalidatePath("/tutor/grades");
  revalidatePath("/portal/grades");
  return { success: true as const };
}

export async function deleteGrade(gradeId: string, studentId: string) {
  const { supabase } = await requireTutor();
  const { error } = await supabase.from("grades").delete().eq("id", gradeId);
  if (error) return { error: error.message };

  revalidatePath(`/tutor/students/${studentId}`);
  revalidatePath("/tutor/grades");
  revalidatePath("/portal/grades");
  return { success: true as const };
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

  // RPC (not a plain .update()) because this may need to migrate data off
  // a duplicate students row auto-created for this profile on their own
  // first sign-in (see the migration for why that happens) before the
  // claim itself can succeed - a bare UPDATE has no way to do that.
  const { error: claimErr } = await supabase.rpc("claim_guest_student", {
    p_student_id: studentId,
    p_profile_id: profile.id,
  });

  if (claimErr) throw new Error(claimErr.message);

  revalidatePath(`/tutor/students/${studentId}`);
  return { success: true as const };
}
