-- Fixes a privilege-escalation bug: "profiles_update_own" only checked
-- `id = auth.uid()`, with no restriction on *which* columns a user may
-- change on their own row. Since Postgres reuses a USING clause as the
-- WITH CHECK when none is given, any authenticated user could UPDATE their
-- own `role` column straight to 'tutor'. Confirmed exploitable against the
-- live project before this fix.
--
-- A column-level WITH CHECK can't reference the pre-update row, so this is
-- enforced with a trigger instead: block any change to `role` unless the
-- caller is the tutor, or the change is coming from a trusted server-side
-- context with no user JWT (auth.uid() is null) — e.g. the Auth service's
-- own signup trigger chain (handle_new_user -> promote_configured_tutor)
-- or a service-role client, both of which already bypass RLS entirely and
-- must remain able to write role.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_tutor() then
    raise exception 'only the tutor can change a profile''s role';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();
