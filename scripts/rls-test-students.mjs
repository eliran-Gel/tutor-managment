// RLS regression test for Phase 2 (students, student_internal_notes,
// parent_students). Verifies the exact acceptance criteria from
// docs/IMPLEMENTATION_PLAN.md Phase 2: a tutor can create a guest student
// and a private rating, and an unrelated student/parent session can never
// read that rating (or even see the guest student at all) — while a parent
// explicitly linked to the child CAN see the child's safe fields but still
// never the private notes/rating.
//
// Usage (bash):
//   set -a; source .env.local; set +a; node scripts/rls-test-students.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const PASSWORD = "test-password-" + Math.random().toString(36).slice(2);

async function createConfirmedUser(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  return data.user;
}

async function signIn(email) {
  const client = createClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return client;
}

const results = [];
let tutorUser, otherUser, parentUser, guestStudentId;

try {
  const tutorEmail = `rls-test-tutor-${Date.now()}@example.com`;
  const otherEmail = `rls-test-other-${Date.now()}@example.com`;
  const parentEmail = `rls-test-parent-${Date.now()}@example.com`;

  tutorUser = await createConfirmedUser(tutorEmail);
  otherUser = await createConfirmedUser(otherEmail);
  parentUser = await createConfirmedUser(parentEmail);

  const { error: promoteErr } = await admin.from("profiles").update({ role: "tutor" }).eq("id", tutorUser.id);
  if (promoteErr) throw promoteErr;

  const clientTutor = await signIn(tutorEmail);

  // Tutor creates a guest student (no linked account).
  const { data: student, error: insertErr } = await clientTutor
    .from("students")
    .insert({ display_name: "תלמיד בדיקה", is_guest: true })
    .select()
    .single();
  if (insertErr) throw insertErr;
  guestStudentId = student.id;
  results.push(`[setup] tutor created guest student ${guestStudentId}, is_guest=${student.is_guest}`);

  // Tutor adds a private rating/notes.
  const { error: notesErr } = await clientTutor
    .from("student_internal_notes")
    .insert({ student_id: guestStudentId, rating: 5, notes: "פרטי - לא לשיתוף" });
  if (notesErr) throw notesErr;
  results.push("[setup] tutor added private rating=5 and notes");

  // Tutor explicitly links `parentUser` as this child's parent.
  const { error: linkErr } = await clientTutor
    .from("parent_students")
    .insert({ parent_profile_id: parentUser.id, student_id: guestStudentId });
  if (linkErr) throw linkErr;
  results.push("[setup] tutor linked parentUser to the guest student");

  // --- Unrelated student/parent: should see NOTHING about this child ---
  const clientOther = await signIn(otherEmail);

  const { data: otherSeesStudent } = await clientOther.from("students").select("id").eq("id", guestStudentId);
  results.push(
    `[unrelated] can see the student row (expect []): ${JSON.stringify(otherSeesStudent)} ${otherSeesStudent?.length === 0 ? "PASS" : "FAIL"}`,
  );

  const { data: otherSeesNotes } = await clientOther
    .from("student_internal_notes")
    .select("rating, notes")
    .eq("student_id", guestStudentId);
  results.push(
    `[unrelated] can see private notes (expect []): ${JSON.stringify(otherSeesNotes)} ${otherSeesNotes?.length === 0 ? "PASS" : "FAIL"}`,
  );

  // --- Linked parent: should see the safe student row, but NEVER the notes ---
  const clientParent = await signIn(parentEmail);

  const { data: parentSeesStudent, error: parentStudentErr } = await clientParent
    .from("students")
    .select("id, display_name")
    .eq("id", guestStudentId)
    .single();
  results.push(
    `[linked parent] reading child's safe fields: ${parentStudentErr ? "FAIL " + parentStudentErr.message : "PASS " + JSON.stringify(parentSeesStudent)}`,
  );

  const { data: parentSeesNotes } = await clientParent
    .from("student_internal_notes")
    .select("rating, notes")
    .eq("student_id", guestStudentId);
  results.push(
    `[linked parent] can see private notes/rating (expect []): ${JSON.stringify(parentSeesNotes)} ${parentSeesNotes?.length === 0 ? "PASS" : "FAIL"}`,
  );
} catch (e) {
  results.push("FATAL: " + e.message);
} finally {
  if (guestStudentId) await admin.from("students").delete().eq("id", guestStudentId);
  if (tutorUser) await admin.auth.admin.deleteUser(tutorUser.id).catch(() => {});
  if (otherUser) await admin.auth.admin.deleteUser(otherUser.id).catch(() => {});
  if (parentUser) await admin.auth.admin.deleteUser(parentUser.id).catch(() => {});
  results.push("Cleaned up test users and student.");
}

console.log(results.join("\n"));
