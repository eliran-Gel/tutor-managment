// Called by the notifications_send_push Postgres trigger (via pg_net)
// immediately after any row is inserted into public.notifications -
// this is the one place all Web Push delivery happens, regardless of
// which RPC created the notification. Never called by the app directly.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const PUSH_TRIGGER_SECRET = Deno.env.get("PUSH_TRIGGER_SECRET")!;
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically into
// every edge function by the platform - no manual `secrets set` needed.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails("mailto:moto.eliran@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  // The function's URL is reachable by anyone who finds it, same as any
  // Postgres RPC - this shared secret is the only thing telling the real
  // trigger apart from a stranger (see the create_notification finding
  // this mirrors).
  if (req.headers.get("x-push-trigger-secret") !== PUSH_TRIGGER_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const { profile_id, title, body, link_path } = await req.json();
  if (!profile_id || !title) {
    return new Response("Bad Request", { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", profile_id);

  const payload = JSON.stringify({
    title,
    body: body ?? "",
    link_path: link_path ?? "/",
  });

  await Promise.all(
    (subscriptions ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (err) {
        // 404/410 means the browser/OS invalidated this subscription
        // (uninstalled, permission revoked, etc.) - stop trying it.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );

  return new Response("ok", { status: 200 });
});
