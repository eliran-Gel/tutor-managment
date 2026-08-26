-- Homework assignment and lesson-file uploads currently go through plain
-- .insert() calls from the tutor's own JS server actions - fine for RLS
-- (homework_tutor_all / lesson_files_tutor_all already allow it), but
-- notifications has no INSERT policy at all by design (every row is
-- written from inside a security definer RPC - see
-- 20260825090000_notifications.sql). So these two need to move into RPCs
-- to notify students the same way every other mutation already does.

create or replace function public.assign_homework(
  p_lesson_id uuid,
  p_student_ids uuid[],
  p_description text,
  p_due_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_profile_id uuid;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can assign homework';
  end if;

  if not exists (select 1 from public.lessons where id = p_lesson_id) then
    raise exception 'lesson not found';
  end if;

  foreach v_student_id in array p_student_ids loop
    insert into public.homework (lesson_id, student_id, description, due_date)
    values (p_lesson_id, v_student_id, p_description, p_due_date);

    select profile_id into v_profile_id from public.students where id = v_student_id;
    if v_profile_id is not null then
      perform public.create_notification(
        v_profile_id, 'homework_assigned', 'הוקצה שיעור בית חדש',
        p_description,
        '/portal/homework'
      );
    end if;
  end loop;
end;
$$;

create or replace function public.confirm_lesson_file_upload(
  p_lesson_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text
)
returns public.lesson_files
language plpgsql
security definer
set search_path = public
as $$
declare
  v_file public.lesson_files;
  v_recipient uuid;
  v_link_path text;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can upload lesson files';
  end if;

  insert into public.lesson_files (lesson_id, file_name, storage_path, mime_type, visible_to_students)
  values (p_lesson_id, p_file_name, p_storage_path, coalesce(nullif(p_mime_type, ''), 'application/octet-stream'), true)
  returning * into v_file;

  v_link_path := case when v_file.mime_type like 'image/%' then '/portal/summaries' else '/portal/materials' end;

  for v_recipient in
    select s.profile_id from public.lesson_participants lp
    join public.students s on s.id = lp.student_id
    where lp.lesson_id = p_lesson_id and s.profile_id is not null
  loop
    perform public.create_notification(
      v_recipient, 'lesson_file_uploaded', 'הועלה תוכן חדש לשיעור',
      p_file_name,
      v_link_path
    );
  end loop;

  return v_file;
end;
$$;
