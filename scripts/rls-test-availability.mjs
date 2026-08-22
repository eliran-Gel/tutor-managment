// RLS regression test for Phase 4 (availability_blocks).
// Usage (bash): set -a; source .env.local; set +a; node scripts/rls-test-availability.mjs
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
let studentUser, blockId;

try {
  const email = `rls-test-avail-${Date.now()}@example.com`;
  studentUser = await createConfirmedUser(email);
  const clientStudent = await signIn(email);

  const { data: created, error: insertErr } = await admin
    .from("availability_blocks")
    .insert({
      start_at: "2026-09-04T13:00:00Z",
      end_at: "2026-09-04T15:00:00Z",
      note: "rls-test block",
    })
    .select()
    .single();
  if (insertErr) throw insertErr;
  blockId = created.id;

  const { data: readData, error: readErr } = await clientStudent.from("availability_blocks").select("*");
  results.push(
    `[student read blocks] ${readErr ? "FAIL " + readErr.message : "PASS got " + readData.length + " row(s)"}`,
  );

  const { data: insertData, error: insertBlockedErr } = await clientStudent
    .from("availability_blocks")
    .insert({ start_at: "2026-09-05T10:00:00Z", end_at: "2026-09-05T11:00:00Z" })
    .select();
  const insertBlocked = !!insertBlockedErr || insertData?.length === 0;
  results.push(
    `[student create block] ${insertBlocked ? "PASS blocked (" + (insertBlockedErr?.message ?? "0 rows") + ")" : "FAIL - insert succeeded"}`,
  );

  const { data: deleteData, error: deleteErr } = await clientStudent
    .from("availability_blocks")
    .delete()
    .eq("id", blockId)
    .select();
  const deleteBlocked = !!deleteErr || deleteData?.length === 0;
  results.push(
    `[student delete block] ${deleteBlocked ? "PASS blocked (" + (deleteErr?.message ?? "0 rows") + ")" : "FAIL - delete succeeded"}`,
  );

  const { data: stillThere } = await admin.from("availability_blocks").select("id").eq("id", blockId);
  results.push(`[verify block still exists after student's delete attempt] ${stillThere?.length === 1 ? "PASS" : "FAIL"}`);
} catch (e) {
  results.push("FATAL: " + e.message);
} finally {
  if (blockId) {
    try {
      await admin.from("availability_blocks").delete().eq("id", blockId);
    } catch {
      // already cleaned up
    }
  }
  if (studentUser) await admin.auth.admin.deleteUser(studentUser.id).catch(() => {});
  results.push("Cleaned up.");
}

console.log(results.join("\n"));
