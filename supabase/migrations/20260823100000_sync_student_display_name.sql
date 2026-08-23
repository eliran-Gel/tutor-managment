-- A registered student's name shown to the tutor (students.display_name -
-- used on the calendar, the student search combobox, the requests page,
-- etc.) was only ever set once, at signup, to their email address
-- (handle_new_user) or metadata name. Editing "שם מלא" on the student's own
-- profile page updates profiles.full_name but never touched
-- students.display_name, so the tutor kept seeing the raw email forever.
--
-- Students are explicitly blocked from writing display_name themselves
-- (restrict_student_self_update, from
-- 20260822141500_student_self_update_grade_school.sql), so the sync has to
-- happen server-side via a trigger on profiles. That trigger's own write to
-- students would otherwise be rejected by restrict_student_self_update (it
-- can't tell a trusted system sync from the student trying to sneak a
-- display_name change through directly) - a transaction-local GUC flag
-- marks this one write as trusted.

create or replace function public.restrict_student_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.syncing_display_name', true), '') = 'true' then
    return new;
  end if;
  if auth.uid() is not null and not public.is_tutor() then
    if new.display_name is distinct from old.display_name
       or new.is_guest is distinct from old.is_guest
       or new.profile_id is distinct from old.profile_id
       or new.claimed_at is distinct from old.claimed_at
       or new.default_price is distinct from old.default_price
       or new.archived_at is distinct from old.archived_at
    then
      raise exception 'students may only update their own grade and school';
    end if;
  end if;
  return new;
end;
$$;

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
    set display_name = coalesce(new.full_name, new.email)
    where profile_id = new.id;
    perform set_config('app.syncing_display_name', 'false', true);
  end if;
  return new;
end;
$$;

create trigger profiles_sync_student_display_name
  after update on public.profiles
  for each row execute function public.sync_student_display_name();

-- One-time backfill: any already-registered student whose profile already
-- has a full_name but whose students.display_name is still stale (set at
-- signup and never synced before this migration existed).
update public.students s
set display_name = coalesce(p.full_name, s.display_name)
from public.profiles p
where p.id = s.profile_id
  and p.full_name is not null
  and p.full_name is distinct from s.display_name;
