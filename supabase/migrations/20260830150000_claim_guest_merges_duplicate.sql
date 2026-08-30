-- handle_new_user() unconditionally creates a fresh (empty) students row for
-- *any* brand-new sign-in (Google included) - so if someone who already has
-- a guest record (with real history) signs themselves up before the tutor
-- claims them, they end up with two students rows: the old one with history,
-- and a new empty auto-created one now holding their profile_id. Since
-- students.profile_id is unique, claiming the old guest row by email used to
-- just fail with "already linked to another student" and no way to recover.
-- This migrates any data off that duplicate onto the guest row being
-- claimed, deletes the now-empty duplicate, then completes the claim -
-- all in one transaction instead of the previous plain client-side update.
create or replace function public.claim_guest_student(p_student_id uuid, p_profile_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_duplicate_id uuid;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can claim a guest student';
  end if;

  select id into v_duplicate_id from public.students
  where profile_id = p_profile_id and id <> p_student_id;

  if v_duplicate_id is not null then
    -- Move what can move; anything left over is a genuine duplicate
    -- (e.g. the same lesson exists under both rows) and gets discarded
    -- along with the duplicate student row itself.
    update public.lesson_participants set student_id = p_student_id
    where student_id = v_duplicate_id
      and not exists (
        select 1 from public.lesson_participants lp2
        where lp2.lesson_id = lesson_participants.lesson_id and lp2.student_id = p_student_id
      );
    delete from public.lesson_participants where student_id = v_duplicate_id;

    update public.homework set student_id = p_student_id where student_id = v_duplicate_id;

    update public.parent_students set student_id = p_student_id
    where student_id = v_duplicate_id
      and not exists (
        select 1 from public.parent_students ps2
        where ps2.parent_profile_id = parent_students.parent_profile_id and ps2.student_id = p_student_id
      );
    delete from public.parent_students where student_id = v_duplicate_id;

    update public.student_internal_notes set student_id = p_student_id
    where student_id = v_duplicate_id
      and not exists (select 1 from public.student_internal_notes n2 where n2.student_id = p_student_id);
    delete from public.student_internal_notes where student_id = v_duplicate_id;

    delete from public.students where id = v_duplicate_id;
  end if;

  update public.students
  set profile_id = p_profile_id, is_guest = false, claimed_at = now()
  where id = p_student_id;
end;
$$;
