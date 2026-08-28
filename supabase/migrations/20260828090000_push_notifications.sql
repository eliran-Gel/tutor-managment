-- Phase 12 (remaining piece): real Web Push delivery, so a notification
-- can reach a phone even when the site isn't open. Vercel's Hobby-plan
-- Cron Jobs only run once/day at minimum, so a Vercel-side polling
-- approach can't deliver anything close to real-time - the send path has
-- to live entirely inside Supabase, which has no such limitation: an
-- AFTER INSERT trigger on notifications calls a Supabase Edge Function
-- (send-push-notification, deployed separately) via pg_net the moment a
-- row is written, regardless of which RPC created it. Fire-and-forget per
-- docs/IMPLEMENTATION_PLAN.md §T - any failure here never blocks the
-- in-app notification insert itself.

create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_profile_id_idx on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

-- Each user manages only their own subscription (subscribe on this
-- device / unsubscribe). The edge function reads across users with its
-- own service-role client to actually send pushes - same "trusted server
-- context bypasses RLS" pattern as getSignedFileUrl in
-- src/lib/lesson-files.ts.
create policy "push_subscriptions_own"
  on public.push_subscriptions for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- An edge function's URL is reachable by anyone who finds it (same
-- exposure class as any Postgres RPC, per the create_notification finding
-- fixed earlier), so the trigger and the function must share a secret the
-- function checks on every call. Stored in Vault (encrypted at rest), not
-- a plain column/GUC. The placeholder below is replaced right after this
-- migration runs by calling set_push_trigger_secret() with a freshly
-- generated value via the service-role client - the real value is never
-- committed to git.
select vault.create_secret(
  'unset-run-set_push_trigger_secret-after-this-migration',
  'push_trigger_secret',
  'Shared secret the notifications_send_push trigger sends to the send-push-notification edge function.'
)
where not exists (select 1 from vault.secrets where name = 'push_trigger_secret');

create or replace function public.set_push_trigger_secret(p_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  update vault.secrets set secret = p_value where name = 'push_trigger_secret';
end;
$$;

revoke execute on function public.set_push_trigger_secret(text) from public;
revoke execute on function public.set_push_trigger_secret(text) from anon;
revoke execute on function public.set_push_trigger_secret(text) from authenticated;

create or replace function public.notifications_send_push()
returns trigger
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_trigger_secret';

  perform extensions.http_post(
    url := 'https://onuaaeiokqcwefvumdoe.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-trigger-secret', v_secret),
    body := jsonb_build_object(
      'profile_id', new.recipient_profile_id,
      'title', new.title,
      'body', new.body,
      'link_path', new.link_path
    )
  );
  return new;
end;
$$;

create trigger notifications_after_insert_send_push
  after insert on public.notifications
  for each row execute function public.notifications_send_push();
