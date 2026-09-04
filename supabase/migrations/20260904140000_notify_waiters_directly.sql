-- Extends the opening-notification (20260904120000) to reach the waiting
-- student/parent directly too, not only the tutor - the tutor's own copy
-- pointed them at "בקשות ופניות" to reach out manually, but the actual
-- flow the tutor wants is: the waiting people request the lesson
-- themselves (now possible for parents too, see 20260904130000), and the
-- tutor approves whichever one they choose from the existing requested-
-- lessons queue (already sorted oldest-first). No change to WHO can see
-- the waitlist itself - a waiter is only ever told about their own
-- entry's opening, never about anyone else's.
create or replace function public.notify_waitlist_of_opening(p_lesson_date date, p_subject_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject_name text;
  v_entry record;
  v_tutor_id uuid;
begin
  select name into v_subject_name from public.subjects where id = p_subject_id;

  for v_entry in
    select we.created_by, coalesce(p.full_name, p.email, 'תלמיד/ה') as requester_name
    from public.waitlist_entries we
    join public.profiles p on p.id = we.created_by
    where we.status = 'waiting' and we.date = p_lesson_date
  loop
    for v_tutor_id in select id from public.profiles where role = 'tutor' loop
      perform public.create_notification(
        v_tutor_id, 'waitlist_opening', 'התפנתה משבצת לרשימת המתנה',
        v_entry.requester_name || ' ממתין/ה לתאריך ' || to_char(p_lesson_date, 'DD/MM/YYYY') ||
          coalesce(' (' || v_subject_name || ')', '') || ' - התפנה שיעור בתאריך הזה.',
        '/tutor/requests'
      );
    end loop;

    perform public.create_notification(
      v_entry.created_by, 'waitlist_opening_self', 'התפנתה משבצת!',
      'התפנה שיעור בתאריך ' || to_char(p_lesson_date, 'DD/MM/YYYY') ||
        coalesce(' (' || v_subject_name || ')', '') || ' - כדאי לנסות לקבוע עכשיו, לפני שמישהו אחר יתפוס.',
      '/portal/lessons'
    );
  end loop;
end;
$$;
