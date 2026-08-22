-- Lets a student fill in their own grade/school after signing up (previously
-- only the tutor could touch the students table - see students_tutor_all).
-- Mirrors the guard pattern from prevent_role_self_escalation: a broad
-- "own row" USING clause combined with a trigger that locks down exactly
-- which columns a non-tutor may change, since a column-level WITH CHECK
-- can't see the pre-update row.
create policy "students_update_own"
  on public.students for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create or replace function public.restrict_student_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

create trigger students_restrict_self_update
  before update on public.students
  for each row execute function public.restrict_student_self_update();
