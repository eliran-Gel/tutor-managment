-- Supabase's edge function gateway rejects any call with no Authorization
-- header by default (401 UNAUTHORIZED_NO_AUTH_HEADER), separate from the
-- function's own x-push-trigger-secret check - net.http_post needs a
-- valid Supabase JWT to get past the gateway at all. The anon key is
-- public (already shipped in the client bundle), so it's fine to embed
-- here; it proves nothing on its own - x-push-trigger-secret remains the
-- real authorization check inside the function itself.
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
    jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-trigger-secret', v_secret,
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udWFhZWlva3Fjd2VmdnVtZG9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NTYwODMsImV4cCI6MjEwMzEzMjA4M30.hbE8erXyQTQxPmGFt0hd7sIPLTc86IxVOYJsnS9-fXE'
    )
  );
  return new;
end;
$$;

drop function if exists public.debug_last_http_response();
