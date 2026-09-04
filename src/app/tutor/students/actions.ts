"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTutor } from "@/lib/auth/require-tutor";
import { createAdminClient } from "@/lib/supabase/admin";
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

/**
 * `delete_student` (the RPC) deliberately never touches profiles/auth -
 * removing a roster entry must never destroy a real person's login by
 * accident, since deleting an auth account is unrecoverable (they'd need
 * to sign up fresh with a new account, losing whatever else that account
 * ever touched). `alsoDeleteAccount` is the explicit, separately-
 * confirmed opt-in for when that login genuinely shouldn't exist anymore
 * (a throwaway test account being the obvious case) - it's an extra step
 * on top of the normal delete, not a replacement for it.
 */
export async function deleteStudent(studentId: string, alsoDeleteAccount = false) {
  const { supabase } = await requireTutor();

  let profileId: string | null = null;
  if (alsoDeleteAccount) {
    const { data: studentRow } = await supabase.from("students").select("profile_id").eq("id", studentId).single();
    profileId = studentRow?.profile_id ?? null;
  }

  const { error } = await supabase.rpc("delete_student", { p_student_id: studentId });
  if (error) return { error: error.message };

  if (profileId) {
    // The student row is already gone at this point - only the login
    // itself (and, via its own on-delete-cascade, the profiles row) is
    // left to remove. Needs the service-role client: deleting an auth
    // user is an Admin API operation, not something the regular
    // session-scoped client (or a plain SQL DELETE) can do correctly -
    // it's also what cleans up sessions/refresh tokens/identities, which
    // a raw `delete from auth.users` would leave dangling.
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.deleteUser(profileId);
    if (authError) return { error: `התלמיד/ה נמחק/ה, אך מחיקת ההתחברות נכשלה: ${authError.message}` };
  }

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

// Shared by linkParentByEmail (an existing account) and inviteParent (a
// brand new one) - either way, the account was created exactly like a
// student's (the signup trigger has no way to know in advance who's going
// to become a parent), so it always comes with role='student' and a
// self-students row. This promotes the role and cleans up that row, but
// only if it truly has no real data (never had a single lesson booked
// under it) - better to leave a rare false-positive orphan than to ever
// silently delete something real.
async function promoteToParentAndCleanupPhantom(
  supabase: Awaited<ReturnType<typeof requireTutor>>["supabase"],
  profileId: string,
) {
  const { error: roleErr } = await supabase.from("profiles").update({ role: "parent" }).eq("id", profileId);
  if (roleErr) throw new Error(roleErr.message);

  const { data: ownStudentRow } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", profileId)
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

// Skips the "parent has to sign up on their own first" step entirely - the
// account (already role='parent', already linked to this student) exists
// the moment this returns, and generates a one-time login link the tutor
// can hand the parent however is actually convenient for them (WhatsApp,
// SMS, in person) - deliberately NOT sent by Supabase's own built-in email
// relay (inviteUserByEmail), which this project has no real SMTP provider
// behind (see supabase/config.toml's commented-out [auth.email.smtp]) and
// failed outright in testing ("Error sending invite email", a generic
// 500 - a known rough edge of Supabase's default/shared mail sending, not
// something to build a feature's only delivery path on). Requires the
// service-role client (admin.auth.admin.*), unlike every other action in
// this file - creating a user isn't something RLS or the regular
// session-scoped client can do.
export async function inviteParent(studentId: string, formData: FormData) {
  const { supabase } = await requireTutor();
  const email = emailSchema.parse(formData.get("email"));

  const existing = await findProfileByEmail(supabase, email);
  if (existing) {
    return {
      error: "כבר קיים משתמש רשום עם האימייל הזה - יש לקשר אותו במקום להזמין (למטה).",
    };
  }

  const admin = createAdminClient();
  const { data: generated, error: genErr } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: "https://app.elirangelberg.com/auth/callback" },
  });
  if (genErr) return { error: genErr.message };

  // The signup trigger already ran synchronously (same DB transaction as
  // the auth.users insert above) - role='parent' and the link below both
  // land before the parent has even opened the link, so whenever they do,
  // the portal already shows the right child immediately with no extra
  // setup step waiting for them.
  await promoteToParentAndCleanupPhantom(admin, generated.user.id);

  const { error: linkErr } = await admin
    .from("parent_students")
    .insert({ parent_profile_id: generated.user.id, student_id: studentId });
  if (linkErr) throw new Error(linkErr.message);

  revalidatePath(`/tutor/students/${studentId}`);
  return { success: true as const, inviteLink: generated.properties.action_link };
}

export async function linkParentByEmail(studentId: string, formData: FormData) {
  const { supabase } = await requireTutor();
  const email = emailSchema.parse(formData.get("email"));

  const profile = await findProfileByEmail(supabase, email);
  if (!profile) {
    return {
      error: `לא נמצא משתמש רשום עם האימייל ${email}. אפשר להזמין אותו/ה כהורה חדש/ה במקום (למעלה).`,
    };
  }

  if (profile.role === "student") {
    await promoteToParentAndCleanupPhantom(supabase, profile.id);
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
