// RLS + acceptance test for Phase 5 (lessons, lesson_participants,
// approve_lesson_request). Mirrors the exact acceptance criterion from
// docs/IMPLEMENTATION_PLAN.md Phase 5: approving a request creates a
// confirmed lesson with the correct price recorded, and changing the
// student's default price afterward does NOT retroactively change it.
//
// Usage (bash): set -a; source .env.local; set +a; node scripts/rls-test-lessons.mjs
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
let tutorUser, studentUser, studentRowId, subjectId, lessonId;

try {
  const tutorEmail = `rls-test-tutor-${Date.now()}@example.com`;
  const studentEmail = `rls-test-student-${Date.now()}@example.com`;

  tutorUser = await createConfirmedUser(tutorEmail);
  studentUser = await createConfirmedUser(studentEmail);
  await admin.from("profiles").update({ role: "tutor" }).eq("id", tutorUser.id);

  const { data: studentRow, error: studentErr } = await admin
    .from("students")
    .insert({
      profile_id: studentUser.id,
      is_guest: false,
      display_name: "תלמיד בדיקה",
      default_price: 100,
    })
    .select()
    .single();
  if (studentErr) throw studentErr;
  studentRowId = studentRow.id;

  const { data: subject, error: subjectErr } = await admin
    .from("subjects")
    .insert({ name: "rls-test-subject-" + Date.now() })
    .select()
    .single();
  if (subjectErr) throw subjectErr;
  subjectId = subject.id;

  const clientStudent = await signIn(studentEmail);
  const requestDate = new Date();
  requestDate.setDate(requestDate.getDate() + 3);
  const dateStr = requestDate.toISOString().slice(0, 10);

  // 1. Student can insert their own pending request.
  const { data: inserted, error: insertErr } = await clientStudent
    .from("lessons")
    .insert({
      date: dateStr,
      start_time: "10:00:00",
      end_time: "11:00:00",
      duration_minutes: 60,
      subject_id: subjectId,
      delivery_mode: "in_person",
      status: "requested",
      source: "student_request",
      created_by: studentUser.id,
    })
    .select()
    .single();
  results.push(`[student create request] ${insertErr ? "FAIL " + insertErr.message : "PASS"}`);
  lessonId = inserted?.id;

  // 2. Student cannot directly insert a CONFIRMED lesson.
  const { data: escalateData, error: escalateErr } = await clientStudent
    .from("lessons")
    .insert({
      date: dateStr,
      start_time: "12:00:00",
      end_time: "13:00:00",
      duration_minutes: 60,
      subject_id: subjectId,
      delivery_mode: "in_person",
      status: "confirmed",
      source: "student_request",
      created_by: studentUser.id,
    })
    .select();
  const escalateBlocked = !!escalateErr || escalateData?.length === 0;
  results.push(
    `[student insert status=confirmed directly] ${escalateBlocked ? "PASS blocked" : "FAIL - succeeded!"}`,
  );

  // 3. Student cannot UPDATE their own request's status.
  const { data: updateData, error: updateErr } = await clientStudent
    .from("lessons")
    .update({ status: "confirmed" })
    .eq("id", lessonId)
    .select();
  const updateBlocked = !!updateErr || updateData?.length === 0;
  results.push(
    `[student update own request to confirmed] ${updateBlocked ? "PASS blocked" : "FAIL - succeeded!"}`,
  );

  // 4. Tutor approves via the RPC.
  const clientTutor = await signIn(tutorEmail);
  const { error: approveErr } = await clientTutor.rpc("approve_lesson_request", {
    target_lesson_id: lessonId,
  });
  results.push(`[tutor approve request] ${approveErr ? "FAIL " + approveErr.message : "PASS"}`);

  const { data: participant } = await admin
    .from("lesson_participants")
    .select("*")
    .eq("lesson_id", lessonId)
    .single();
  results.push(
    `[price snapshot at approval, expect 100] ${participant?.price_charged} ${Number(participant?.price_charged) === 100 ? "PASS" : "FAIL"}`,
  );

  const { data: confirmedLesson } = await admin.from("lessons").select("status").eq("id", lessonId).single();
  results.push(`[lesson status after approval, expect confirmed] ${confirmedLesson?.status} ${confirmedLesson?.status === "confirmed" ? "PASS" : "FAIL"}`);

  // 5. Change the student's default price AFTER approval.
  await admin.from("students").update({ default_price: 200 }).eq("id", studentRowId);
  const { data: participantAfter } = await admin
    .from("lesson_participants")
    .select("price_charged")
    .eq("lesson_id", lessonId)
    .single();
  results.push(
    `[price_charged unaffected by later default_price change, expect still 100] ${participantAfter?.price_charged} ${Number(participantAfter?.price_charged) === 100 ? "PASS" : "FAIL"}`,
  );

  // 6. Student can now see their confirmed lesson with the snapshotted price.
  const { data: studentSeesLesson } = await clientStudent.from("lessons").select("id, status").eq("id", lessonId).single();
  results.push(`[student sees own confirmed lesson] ${studentSeesLesson?.status === "confirmed" ? "PASS" : "FAIL"}`);
} catch (e) {
  results.push("FATAL: " + e.message);
} finally {
  if (lessonId) await admin.from("lessons").delete().eq("id", lessonId);
  if (subjectId) await admin.from("subjects").delete().eq("id", subjectId);
  if (studentRowId) await admin.from("students").delete().eq("id", studentRowId);
  if (tutorUser) await admin.auth.admin.deleteUser(tutorUser.id).catch(() => {});
  if (studentUser) await admin.auth.admin.deleteUser(studentUser.id).catch(() => {});
  results.push("Cleaned up.");
}

console.log(results.join("\n"));
