-- Lets the tutor permanently remove a dead-end lesson from history (e.g.
-- a rejected request) that has no ongoing relevance. Scoped to
-- rejected/cancelled only, never confirmed/completed - those carry real
-- business/financial history (payments, homework, files) that shouldn't
-- be permanently destroyable from a plain history list. Cascades to
-- lesson_participants, homework, lesson_files, and change_requests
-- automatically (all declared `on delete cascade` against lessons).
create or replace function public.delete_lesson_from_history(target_lesson_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status public.lesson_status;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can delete a lesson';
  end if;

  select status into v_status from public.lessons where id = target_lesson_id;
  if not found then
    raise exception 'lesson not found';
  end if;
  if v_status not in ('rejected', 'cancelled') then
    raise exception 'only rejected or cancelled lessons can be deleted from history';
  end if;

  delete from public.lessons where id = target_lesson_id;
end;
$$;
