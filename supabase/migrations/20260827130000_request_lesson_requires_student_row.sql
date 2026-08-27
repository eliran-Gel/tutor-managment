-- Real bug report: the tutor permanently deleted a student
-- (delete_student() only removes the students row + their lessons, it was
-- never meant to touch profiles/auth.users - that's a separate account the
-- person still owns and can still log into). request_lesson() never
-- checked that the caller actually has a students row, only that they're
-- authenticated at all, so the "deleted" person could still open the
-- portal and successfully submit a new lesson request, which then showed
-- up for the tutor to approve.
create or replace function public.request_lesson(
  p_date date,
  p_start_time time,
  p_end_time time,
  p_duration_minutes int,
  p_delivery_mode public.delivery_mode,
  p_subject_id uuid,
  p_topic text
)
returns public.lessons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_tutor_id uuid;
begin
  if not exists (select 1 from public.students where profile_id = auth.uid()) then
    raise exception 'לא נמצאה רשומת תלמיד/ה עבור המשתמש הזה. יש ליצור קשר עם המורה.';
  end if;

  insert into public.lessons (
    date, start_time, end_time, duration_minutes, lesson_type, delivery_mode,
    subject_id, topic, status, source, forced, created_by
  ) values (
    p_date, p_start_time, p_end_time, p_duration_minutes, 'individual', p_delivery_mode,
    p_subject_id, nullif(p_topic, ''), 'requested', 'student_request', false, auth.uid()
  ) returning * into v_lesson;

  for v_tutor_id in select id from public.profiles where role = 'tutor' loop
    perform public.create_notification(
      v_tutor_id, 'lesson_requested', 'בקשה חדשה לשיעור',
      'התקבלה בקשה לשיעור בתאריך ' || to_char(v_lesson.date, 'DD/MM/YYYY') || ' בשעה ' || to_char(v_lesson.start_time, 'HH24:MI') || '.',
      '/tutor/requests'
    );
  end loop;

  return v_lesson;
end;
$$;
