-- approve_lesson_request never checked for a time overlap against other
-- confirmed lessons - two students can both have pending requests for
-- overlapping times (allowed; only confirmed lessons should block), but
-- approving both of them silently produced two overlapping confirmed
-- lessons. The client-side checkLessonConflicts() only guards the tutor's
-- manual-lesson form, not approval, so this closes the gap at the source
-- of truth.
create or replace function public.approve_lesson_request(target_lesson_id uuid)
returns public.lessons
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_student public.students;
  v_price numeric(10, 2);
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can approve requests';
  end if;

  select * into v_lesson from public.lessons where id = target_lesson_id for update;
  if not found then
    raise exception 'lesson not found';
  end if;
  if v_lesson.status <> 'requested' then
    raise exception 'lesson is not pending (status: %)', v_lesson.status;
  end if;

  if exists (
    select 1 from public.lessons
    where date = v_lesson.date
      and status = 'confirmed'
      and id <> v_lesson.id
      and start_time < v_lesson.end_time
      and end_time > v_lesson.start_time
  ) then
    raise exception 'overlap_conflict';
  end if;

  select * into v_student from public.students where profile_id = v_lesson.created_by;
  if not found then
    raise exception 'could not resolve the requesting student';
  end if;

  v_price := public.calculate_lesson_price(v_lesson.lesson_type, v_lesson.duration_minutes);

  insert into public.lesson_participants (lesson_id, student_id, price_charged)
  values (target_lesson_id, v_student.id, v_price);

  update public.lessons set status = 'confirmed' where id = target_lesson_id
  returning * into v_lesson;

  return v_lesson;
end;
$$;
