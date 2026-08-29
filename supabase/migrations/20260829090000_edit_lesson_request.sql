-- Lets a student edit their own still-pending request (date/time/duration/
-- subject/delivery/topic) instead of only being able to cancel it and
-- start over. Mirrors cancel_lesson_request's shape exactly: only rows
-- the caller themselves created, only while status is still 'requested',
-- and it notifies every tutor the same way a fresh request would.
create or replace function public.edit_lesson_request(
  target_lesson_id uuid,
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
  update public.lessons
  set date = p_date,
      start_time = p_start_time,
      end_time = p_end_time,
      duration_minutes = p_duration_minutes,
      delivery_mode = p_delivery_mode,
      subject_id = p_subject_id,
      topic = nullif(p_topic, '')
  where id = target_lesson_id and status = 'requested' and created_by = auth.uid()
  returning * into v_lesson;

  if not found then
    raise exception 'lesson not found, not pending, or not yours';
  end if;

  for v_tutor_id in select id from public.profiles where role = 'tutor' loop
    perform public.create_notification(
      v_tutor_id, 'lesson_request_edited', 'בקשת שיעור עודכנה',
      'הבקשה לשיעור בתאריך ' || to_char(v_lesson.date, 'DD/MM/YYYY') || ' בשעה ' || to_char(v_lesson.start_time, 'HH24:MI') || ' עודכנה.',
      '/tutor/requests'
    );
  end loop;

  return v_lesson;
end;
$$;
