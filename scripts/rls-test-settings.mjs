// RLS regression test for Phase 3 (business_links, tutor_settings).
// Usage (bash): set -a; source .env.local; set +a; node scripts/rls-test-settings.mjs
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
let studentUser;

try {
  const email = `rls-test-student-${Date.now()}@example.com`;
  studentUser = await createConfirmedUser(email);
  const clientStudent = await signIn(email);

  const { data: linksRead, error: linksReadErr } = await clientStudent.from("business_links").select("*");
  results.push(
    `[student read business_links] ${linksReadErr ? "FAIL " + linksReadErr.message : "PASS got " + linksRead.length + " row(s)"}`,
  );

  // Note: PostgREST does not error when RLS silently filters an UPDATE
  // down to zero matching rows - it reports success with an empty result.
  // .select() forces the response to include the (empty) affected rows so
  // we can tell "blocked" apart from "actually succeeded".
  const { data: linksWriteData, error: linksWriteErr } = await clientStudent
    .from("business_links")
    .update({ website_url: "https://hacked.example.com" })
    .eq("id", true)
    .select();
  const linksWriteBlocked = !!linksWriteErr || linksWriteData?.length === 0;
  results.push(
    `[student write business_links] ${linksWriteBlocked ? "PASS blocked (" + (linksWriteErr?.message ?? "0 rows affected") + ")" : "FAIL - write succeeded: " + JSON.stringify(linksWriteData)}`,
  );

  const { data: settingsRead } = await clientStudent.from("tutor_settings").select("*");
  results.push(
    `[student read tutor_settings, expect empty] ${JSON.stringify(settingsRead)} ${settingsRead?.length === 0 ? "PASS" : "FAIL"}`,
  );

  const { data: settingsWriteData, error: settingsWriteErr } = await clientStudent
    .from("tutor_settings")
    .update({ payment_reminder_days: 999 })
    .eq("id", true)
    .select();
  const settingsWriteBlocked = !!settingsWriteErr || settingsWriteData?.length === 0;
  results.push(
    `[student write tutor_settings] ${settingsWriteBlocked ? "PASS blocked (" + (settingsWriteErr?.message ?? "0 rows affected") + ")" : "FAIL - write succeeded: " + JSON.stringify(settingsWriteData)}`,
  );
} catch (e) {
  results.push("FATAL: " + e.message);
} finally {
  if (studentUser) await admin.auth.admin.deleteUser(studentUser.id).catch(() => {});
  results.push("Cleaned up test user.");
}

console.log(results.join("\n"));
