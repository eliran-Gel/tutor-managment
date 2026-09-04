-- When the waitlist-opening notification (20260904140000) goes out, more
-- than one person can end up submitting a request for the exact same
-- freed slot. Approving the first one used to make approving any other
-- overlapping *pending* request fail with a confusing overlap_conflict -
-- indistinguishable from the genuine, more serious case (the slot is
-- already taken by a real, unrelated confirmed lesson). The tutor's own
-- request: approving one should just quietly decline the others, not
-- block on them.
--
-- The two cases stay clearly separate: a conflict against an already-
-- CONFIRMED lesson still blocks outright (raising overlap_conflict) -
-- that's a real double-booking against an existing commitment, never
-- auto-resolved. A conflict against another still-REQUESTED lesson (a
-- sibling competing for the same opening, not yet a commitment to
-- anyone) is what gets auto-rejected here, reusing the same status/
-- notification shape as a manual reject_lesson_request.
create or replace function public.approve_lesson_request(target_lesson_id uuid)
returns public.lessons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_student public.students;
  v_price numeric(10, 2);
  v_competing public.lessons;
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

  for v_competing in
    select * from public.lessons
    where date = v_lesson.date
      and status = 'requested'
      and id <> v_lesson.id
      and start_time < v_lesson.end_time
      and end_time > v_lesson.start_time
  loop
    update public.lessons
    set status = 'rejected', rejection_reason = 'המשבצת הזו כבר אושרה למישהו/י אחר/ת'
    where id = v_competing.id;

    perform public.create_notification(
      v_competing.created_by, 'lesson_rejected', 'הבקשה לשיעור נדחתה',
      'הבקשה לשיעור בתאריך ' || to_char(v_competing.date, 'DD/MM/YYYY') || ' בשעה ' || to_char(v_competing.start_time, 'HH24:MI') || ' נדחתה.'
        || ' הערה: המשבצת הזו כבר אושרה למישהו/י אחר/ת.',
      '/portal/lessons'
    );
  end loop;

  if v_lesson.requested_student_id is not null then
    select * into v_student from public.students where id = v_lesson.requested_student_id;
  else
    select * into v_student from public.students where profile_id = v_lesson.created_by;
  end if;
  if not found then
    raise exception 'could not resolve the requesting student';
  end if;

  v_price := public.calculate_lesson_price(v_lesson.lesson_type, v_lesson.duration_minutes);

  insert into public.lesson_participants (lesson_id, student_id, price_charged)
  values (target_lesson_id, v_student.id, v_price);

  update public.lessons set status = 'confirmed' where id = target_lesson_id
  returning * into v_lesson;

  perform public.create_notification(
    v_lesson.created_by, 'lesson_approved', 'השיעור אושר',
    'השיעור בתאריך ' || to_char(v_lesson.date, 'DD/MM/YYYY') || ' בשעה ' || to_char(v_lesson.start_time, 'HH24:MI') || ' אושר.',
    '/portal/lessons'
  );

  return v_lesson;
end;
$$;
