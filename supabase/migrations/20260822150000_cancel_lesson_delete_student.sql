-- Lets the tutor cancel a lesson that was already confirmed (previously
-- only "requested" lessons could be rejected; a confirmed lesson had no
-- cancellation path at all).
create or replace function public.cancel_lesson(target_lesson_id uuid)
returns public.lessons
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lesson public.lessons;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can cancel a lesson';
  end if;

  update public.lessons set status = 'cancelled'
  where id = target_lesson_id and status = 'confirmed'
  returning * into v_lesson;

  if not found then
    raise exception 'lesson not found or not confirmed';
  end if;

  return v_lesson;
end;
$$;

-- Permanently deletes a student (distinct from archiving, which keeps
-- history but hides them from active views). An individual lesson where
-- this student was the sole participant is meaningless once they're gone,
-- so it's deleted outright (cascades to its own lesson_participants row).
-- A group lesson keeps its other participants; only this student's row
-- is removed from it.
create or replace function public.delete_student(p_student_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lesson_id uuid;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can delete a student';
  end if;

  for v_lesson_id in
    select l.id from public.lessons l
    join public.lesson_participants lp on lp.lesson_id = l.id
    where lp.student_id = p_student_id and l.lesson_type = 'individual'
  loop
    delete from public.lessons where id = v_lesson_id;
  end loop;

  delete from public.lesson_participants where student_id = p_student_id;
  delete from public.students where id = p_student_id;
end;
$$;
