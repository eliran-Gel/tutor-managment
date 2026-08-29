-- A rejected/cancelled request also lingers in the student's own
-- "השיעורים שלי" list (that page queries lessons directly, unlike the
-- tutor's per-student history which goes through lesson_participants and
-- so never shows a never-approved rejected request at all). Widen the
-- delete to let the student who made the request clear their own
-- dead-end entries too, not just the tutor.
create or replace function public.delete_lesson_from_history(target_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.lesson_status;
  v_created_by uuid;
begin
  select status, created_by into v_status, v_created_by from public.lessons where id = target_lesson_id;
  if not found then
    raise exception 'lesson not found';
  end if;

  if not (public.is_tutor() or v_created_by = auth.uid()) then
    raise exception 'not authorized to delete this lesson';
  end if;

  if v_status not in ('rejected', 'cancelled') then
    raise exception 'only rejected or cancelled lessons can be deleted from history';
  end if;

  delete from public.lessons where id = target_lesson_id;
end;
$$;
