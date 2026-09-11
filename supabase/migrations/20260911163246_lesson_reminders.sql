-- Scheduled lesson reminders: a push notification 1 day before and 2 hours
-- before each confirmed lesson, nudging the student/parent to send the
-- tutor the topic and practice materials ahead of time.
--
-- No application code ever "sends a push" directly in this project (see
-- 20260828090000_push_notifications.sql) - inserting into
-- public.notifications is enough, since an AFTER INSERT trigger on that
-- table already fans the row out to a real browser push via the
-- send-push-notification edge function. This migration only needs to get
-- the right rows inserted at the right time; the existing pipeline does
-- the rest.
--
-- Vercel's Hobby-plan cron can't run more often than once/day (see the
-- same migration above), far too coarse for a "2 hours before" reminder -
-- pg_cron running inside Postgres itself has no such floor, so that's
-- what schedules this.

create extension if not exists pg_cron;

-- Dedup: without this, a cron tick that runs while a lesson is still
-- inside its reminder window would just re-send the same reminder every
-- 15 minutes until the window passes.
alter table public.lessons
  add column reminder_1d_sent_at timestamptz,
  add column reminder_2h_sent_at timestamptz;

-- security definer, and deliberately bypasses create_notification (whose
-- own authorization check requires the CALLER to be the tutor via
-- auth.uid() - meaningless in a cron context, where there is no
-- authenticated request at all). This function inserts into
-- public.notifications directly instead, which is safe here because the
-- function body itself - not caller identity - is what decides who gets
-- notified.
create or replace function public.send_lesson_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson record;
  v_participant record;
  v_student record;
  v_parent record;
  v_body constant text := 'כבר שלחת לאלירן את הנושא וחומרים לתרגול?';
begin
  -- 1-day-before window: lesson start falls 23h45m-24h15m from now. The
  -- window width matches the cron interval below (15 min) so each lesson
  -- is guaranteed to be caught by exactly one tick.
  for v_lesson in
    select * from public.lessons
    where status = 'confirmed'
      and reminder_1d_sent_at is null
      and ((date + start_time) at time zone 'Asia/Jerusalem')
        between now() + interval '23 hours 45 minutes' and now() + interval '24 hours 15 minutes'
  loop
    for v_participant in
      select * from public.lesson_participants where lesson_id = v_lesson.id
    loop
      select * into v_student from public.students where id = v_participant.student_id;
      if not found then
        continue;
      end if;

      if v_student.profile_id is not null then
        insert into public.notifications (recipient_profile_id, type, title, body, link_path)
        values (v_student.profile_id, 'lesson_reminder_1d', 'תזכורת לשיעור מחר', v_body, '/portal/lessons');
      end if;

      for v_parent in
        select * from public.parent_students where student_id = v_student.id
      loop
        insert into public.notifications (recipient_profile_id, type, title, body, link_path)
        values (v_parent.parent_profile_id, 'lesson_reminder_1d', 'תזכורת לשיעור מחר', v_body, '/portal/lessons');
      end loop;
    end loop;

    update public.lessons set reminder_1d_sent_at = now() where id = v_lesson.id;
  end loop;

  -- 2-hours-before window: lesson start falls 1h45m-2h15m from now.
  for v_lesson in
    select * from public.lessons
    where status = 'confirmed'
      and reminder_2h_sent_at is null
      and ((date + start_time) at time zone 'Asia/Jerusalem')
        between now() + interval '1 hour 45 minutes' and now() + interval '2 hours 15 minutes'
  loop
    for v_participant in
      select * from public.lesson_participants where lesson_id = v_lesson.id
    loop
      select * into v_student from public.students where id = v_participant.student_id;
      if not found then
        continue;
      end if;

      if v_student.profile_id is not null then
        insert into public.notifications (recipient_profile_id, type, title, body, link_path)
        values (v_student.profile_id, 'lesson_reminder_2h', 'תזכורת לשיעור בעוד שעתיים', v_body, '/portal/lessons');
      end if;

      for v_parent in
        select * from public.parent_students where student_id = v_student.id
      loop
        insert into public.notifications (recipient_profile_id, type, title, body, link_path)
        values (v_parent.parent_profile_id, 'lesson_reminder_2h', 'תזכורת לשיעור בעוד שעתיים', v_body, '/portal/lessons');
      end loop;
    end loop;

    update public.lessons set reminder_2h_sent_at = now() where id = v_lesson.id;
  end loop;
end;
$$;

-- No direct client access - this is only ever invoked by pg_cron.
revoke execute on function public.send_lesson_reminders() from public;
revoke execute on function public.send_lesson_reminders() from anon;
revoke execute on function public.send_lesson_reminders() from authenticated;

select cron.schedule(
  'send-lesson-reminders',
  '*/15 * * * *',
  $$select public.send_lesson_reminders();$$
);
