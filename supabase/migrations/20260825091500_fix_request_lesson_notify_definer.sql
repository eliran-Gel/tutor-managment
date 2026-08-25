-- request_lesson was left as security invoker, so its
-- `select id from public.profiles where role = 'tutor'` loop ran under the
-- calling student's RLS (profiles_select_own only allows seeing your own
-- row) and silently found zero tutors to notify. request_lesson_change
-- already got this right - request_lesson was simply missed. Fix by
-- switching to security definer, matching every other RPC in
-- 20260825090000_notifications.sql that needs to look up recipients
-- outside the caller's own RLS-visible rows.
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
