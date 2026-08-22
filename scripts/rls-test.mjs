// RLS regression test for the `profiles` table (Phase 1). Creates two
// throwaway users, exercises cross-role isolation and the role-escalation
// guard against the real Supabase project, then deletes them.
//
// Usage (bash):
//   set -a; source .env.local; set +a; node scripts/rls-test.mjs
//
// Requires SUPABASE_SERVICE_ROLE_KEY — never run this against a project
// whose service-role key you don't control.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const PASSWORD = "test-password-" + Math.random().toString(36).slice(2);

async function createConfirmedUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
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
let userA, userB;

try {
  const emailA = `rls-test-a-${Date.now()}@example.com`;
  const emailB = `rls-test-b-${Date.now()}@example.com`;

  userA = await createConfirmedUser(emailA);
  userB = await createConfirmedUser(emailB);

  const clientA = await signIn(emailA);

  // 1. Isolation still intact: A can't read B's row.
  const { data: otherProfile } = await clientA.from("profiles").select("id").eq("id", userB.id);
  results.push(`[isolation] A reading B's profile (expect []): ${JSON.stringify(otherProfile)}`);

  // 2. Self-escalation is now blocked for a regular authenticated user.
  const { error: escalateErr } = await clientA
    .from("profiles")
    .update({ role: "tutor" })
    .eq("id", userA.id);
  results.push(
    `[security-fix] A self-promoting to tutor: ${escalateErr ? "BLOCKED (" + escalateErr.message + ")" : "!!! STILL SUCCEEDED - BUG NOT FIXED"}`,
  );

  // 3. Non-role updates to your own row still work normally (e.g. full_name).
  const { error: nameErr } = await clientA
    .from("profiles")
    .update({ full_name: "Test Name" })
    .eq("id", userA.id);
  results.push(`[still-works] A updating own full_name: ${nameErr ? "ERROR " + nameErr.message : "OK"}`);

  // 4. The admin/service-role path (same mechanism the bootstrap trigger and
  // future tutor-management actions use) can still legitimately set role.
  const { error: adminSetErr } = await admin.from("profiles").update({ role: "tutor" }).eq("id", userB.id);
  results.push(
    `[service-role-still-works] admin setting B's role to tutor: ${adminSetErr ? "ERROR " + adminSetErr.message : "OK"}`,
  );
  const { data: bAfter } = await admin.from("profiles").select("role").eq("id", userB.id).single();
  results.push(`B's role after admin update (expect tutor): ${bAfter.role}`);

  await admin.auth.admin.deleteUser(userA.id);
  await admin.auth.admin.deleteUser(userB.id);
  results.push("Cleaned up test users.");
} catch (e) {
  results.push("FATAL: " + e.message);
  if (userA) await admin.auth.admin.deleteUser(userA.id).catch(() => {});
  if (userB) await admin.auth.admin.deleteUser(userB.id).catch(() => {});
}

console.log(results.join("\n"));
