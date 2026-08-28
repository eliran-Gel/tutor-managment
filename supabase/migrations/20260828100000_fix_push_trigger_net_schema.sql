-- pg_net was already pre-installed on this project under schema `net`
-- (Supabase's own default), not `extensions` - confirmed by querying
-- pg_proc directly. The `create extension ... with schema extensions` in
-- the original migration was a harmless no-op against the already-existing
-- installation; the function just needed to call net.http_post.
create or replace function public.notifications_send_push()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_trigger_secret';

  perform net.http_post(
    'https://onuaaeiokqcwefvumdoe.supabase.co/functions/v1/send-push-notification',
    jsonb_build_object(
      'profile_id', new.recipient_profile_id,
      'title', new.title,
      'body', new.body,
      'link_path', new.link_path
    ),
    '{}'::jsonb,
    jsonb_build_object('Content-Type', 'application/json', 'x-push-trigger-secret', v_secret)
  );
  return new;
end;
$$;

drop function if exists public.debug_pgnet_signature();
