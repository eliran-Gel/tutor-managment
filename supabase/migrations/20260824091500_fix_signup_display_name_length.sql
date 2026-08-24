-- Adding the 40-char CHECK on students.display_name broke signup entirely
-- for any account whose email exceeds 40 chars: handle_new_user() falls
-- back to the raw email as a temporary display_name until the user sets
-- their real name, and that insert now violated the constraint, failing
-- the whole signup transaction. Truncate the fallback so it always fits -
-- the 40-char cap is meant to bound real names, not block account
-- creation over an auto-generated placeholder.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name');

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    v_display_name,
    new.raw_user_meta_data ->> 'avatar_url',
    'student'
  );

  if new.email <> 'moto.eliran@gmail.com' then
    insert into public.students (profile_id, is_guest, claimed_at, display_name)
    values (new.id, false, now(), left(coalesce(v_display_name, new.email), 40));
  end if;

  return new;
end;
$$;

-- Same fallback-to-email hazard exists here: if a student clears their
-- full_name back to null, the sync would fall back to their (possibly
-- >40-char) email and violate the same constraint.
create or replace function public.sync_student_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.full_name is distinct from old.full_name then
    perform set_config('app.syncing_display_name', 'true', true);
    update public.students
    set display_name = left(coalesce(new.full_name, new.email), 40)
    where profile_id = new.id;
    perform set_config('app.syncing_display_name', 'false', true);
  end if;
  return new;
end;
$$;
