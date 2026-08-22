// RLS + acceptance test for Phase 6 (manual/forced/group lessons via
// create_manual_lesson). Mirrors the exact acceptance criterion: a group
// lesson for 3 students at 3 different prices produces 3 correct
// lesson_participants rows and is visible to all 3 students.
//
// Usage (bash): set -a; source .env.local; set +a; node scripts/rls-test-manual-lessons.mjs
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
let tutorUser, otherUser, subjectId, lessonId;
const studentRowIds = [];
const studentUsers = [];

try {
  const tutorEmail = `rls-test-tutor-${Date.now()}@example.com`;
  tutorUser = await createConfirmedUser(tutorEmail);
  await admin.from("profiles").update({ role: "tutor" }).eq("id", tutorUser.id);

  const otherEmail = `rls-test-other-${Date.now()}@example.com`;
  otherUser = await createConfirmedUser(otherEmail);

  const prices = [100, 150, 200];
  for (let i = 0; i < 3; i++) {
    const email = `rls-test-student${i}-${Date.now()}@example.com`;
    const u = await createConfirmedUser(email);
    studentUsers.push({ ...u, email });
    const { data: row } = await admin
      .from("students")
      .insert({ profile_id: u.id, is_guest: false, display_name: `תלמיד ${i}`, default_price: prices[i] })
      .select()
      .single();
    studentRowIds.push(row.id);
  }

  const { data: subject } = await admin
    .from("subjects")
    .insert({ name: "rls-test-subject-" + Date.now() })
    .select()
    .single();
  subjectId = subject.id;

  const clientTutor = await signIn(tutorEmail);
  const clientOther = await signIn(otherEmail);

  // 1. Non-tutor cannot call the RPC at all.
  const { error: rpcBlockedErr } = await clientOther.rpc("create_manual_lesson", {
    p_date: "2026-09-10",
    p_start_time: "10:00:00",
    p_end_time: "11:00:00",
    p_duration_minutes: 60,
    p_lesson_type: "individual",
    p_delivery_mode: "in_person",
    p_subject_id: subjectId,
    p_topic: "",
    p_online_url: "",
    p_forced: false,
    p_participants: [{ student_id: studentRowIds[0], price: 999 }],
  });
  results.push(`[non-tutor RPC call] ${rpcBlockedErr ? "PASS blocked (" + rpcBlockedErr.message + ")" : "FAIL - succeeded!"}`);

  // 2. Tutor creates a group lesson with 3 students at 3 distinct prices.
  const { data: lesson, error: createErr } = await clientTutor.rpc("create_manual_lesson", {
    p_date: "2026-09-10",
    p_start_time: "16:00:00",
    p_end_time: "17:00:00",
    p_duration_minutes: 60,
    p_lesson_type: "group",
    p_delivery_mode: "in_person",
    p_subject_id: subjectId,
    p_topic: "שיעור קבוצתי מוואטסאפ",
    p_online_url: "",
    p_forced: false,
    p_participants: [
      { student_id: studentRowIds[0], price: 100 },
      { student_id: studentRowIds[1], price: 150 },
      { student_id: studentRowIds[2], price: 200 },
    ],
  });
  results.push(`[tutor create group lesson] ${createErr ? "FAIL " + createErr.message : "PASS"}`);
  lessonId = lesson?.id;
  results.push(`[lesson status=confirmed, source=tutor_manual] ${lesson?.status === "confirmed" && lesson?.source === "tutor_manual" ? "PASS" : "FAIL got " + JSON.stringify(lesson)}`);

  // 3. Verify 3 lesson_participants rows with correct distinct prices.
  const { data: participants } = await admin
    .from("lesson_participants")
    .select("student_id, price_charged")
    .eq("lesson_id", lessonId)
    .order("price_charged");
  const gotPrices = (participants ?? []).map((p) => Number(p.price_charged));
  results.push(
    `[3 participants with distinct prices 100/150/200] ${JSON.stringify(gotPrices)} ${JSON.stringify(gotPrices) === JSON.stringify([100, 150, 200]) ? "PASS" : "FAIL"}`,
  );

  // 4. Each of the 3 students can see the lesson on their own dashboard.
  for (let i = 0; i < 3; i++) {
    const client = await signIn(studentUsers[i].email);
    const { data: seen } = await client.from("lessons").select("id, status").eq("id", lessonId).maybeSingle();
    results.push(`[student ${i} sees the group lesson] ${seen?.status === "confirmed" ? "PASS" : "FAIL"}`);
  }

  // 5. An unrelated student/parent cannot see it.
  const { data: otherSees } = await clientOther.from("lessons").select("id").eq("id", lessonId);
  results.push(`[unrelated user cannot see lesson] ${otherSees?.length === 0 ? "PASS" : "FAIL"}`);

  // 6. DB-level guard: more than 3 participants is rejected.
  const { error: tooManyErr } = await clientTutor.rpc("create_manual_lesson", {
    p_date: "2026-09-11",
    p_start_time: "10:00:00",
    p_end_time: "11:00:00",
    p_duration_minutes: 60,
    p_lesson_type: "group",
    p_delivery_mode: "in_person",
    p_subject_id: subjectId,
    p_topic: "",
    p_online_url: "",
    p_forced: false,
    p_participants: [
      { student_id: studentRowIds[0], price: 1 },
      { student_id: studentRowIds[1], price: 1 },
      { student_id: studentRowIds[2], price: 1 },
      { student_id: studentRowIds[0], price: 1 },
    ],
  });
  results.push(`[reject >3 participants] ${tooManyErr ? "PASS blocked (" + tooManyErr.message + ")" : "FAIL - succeeded!"}`);
} catch (e) {
  results.push("FATAL: " + e.message);
} finally {
  if (lessonId) await admin.from("lessons").delete().eq("id", lessonId);
  if (subjectId) await admin.from("subjects").delete().eq("id", subjectId);
  for (const id of studentRowIds) await admin.from("students").delete().eq("id", id);
  if (tutorUser) await admin.auth.admin.deleteUser(tutorUser.id).catch(() => {});
  if (otherUser) await admin.auth.admin.deleteUser(otherUser.id).catch(() => {});
  for (const u of studentUsers) await admin.auth.admin.deleteUser(u.id).catch(() => {});
  results.push("Cleaned up.");
}

console.log(results.join("\n"));
