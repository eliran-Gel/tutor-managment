-- Combined, simplified version of the original plan's Phases 8-10: homework,
-- a lesson summary as an uploaded image (no AI drafting pipeline - the
-- tutor explicitly wants a photo, not AI-generated text), and general
-- lesson materials/attachments. All three are per-lesson content the
-- relevant participants (student/parent) get to see.

create or replace function public.is_lesson_participant(target_lesson_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.lesson_participants lp
    where lp.lesson_id = target_lesson_id
      and (public.owns_student(lp.student_id) or public.is_parent_of(lp.student_id))
  );
$$;

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  description text not null,
  due_date date,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create index homework_student_idx on public.homework (student_id);
create index homework_lesson_idx on public.homework (lesson_id);

alter table public.homework enable row level security;

create policy "homework_tutor_all"
  on public.homework for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "homework_select_own"
  on public.homework for select
  using (public.owns_student(student_id));

create policy "homework_select_parent"
  on public.homework for select
  using (public.is_parent_of(student_id));

-- Students/parents may mark their own homework done, nothing else - same
-- reasoning as restrict_notification_self_update in
-- 20260825090000_notifications.sql (WITH CHECK can't see OLD, so a
-- BEFORE UPDATE trigger is the only way to lock the other columns).
create policy "homework_update_done"
  on public.homework for update
  using (public.owns_student(student_id) or public.is_parent_of(student_id))
  with check (public.owns_student(student_id) or public.is_parent_of(student_id));

create or replace function public.restrict_homework_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_tutor() then
    if new.lesson_id is distinct from old.lesson_id
       or new.student_id is distinct from old.student_id
       or new.description is distinct from old.description
       or new.due_date is distinct from old.due_date
       or new.created_at is distinct from old.created_at
    then
      raise exception 'students may only mark their own homework done';
    end if;
  end if;
  return new;
end;
$$;

create trigger homework_restrict_self_update
  before update on public.homework
  for each row execute function public.restrict_homework_self_update();

create table public.lesson_summaries (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index lesson_summaries_lesson_idx on public.lesson_summaries (lesson_id);

alter table public.lesson_summaries enable row level security;

create policy "lesson_summaries_tutor_all"
  on public.lesson_summaries for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "lesson_summaries_select_participant"
  on public.lesson_summaries for select
  using (public.is_lesson_participant(lesson_id));

create table public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  visible_to_students boolean not null default true,
  created_at timestamptz not null default now()
);

create index lesson_materials_lesson_idx on public.lesson_materials (lesson_id);

alter table public.lesson_materials enable row level security;

create policy "lesson_materials_tutor_all"
  on public.lesson_materials for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "lesson_materials_select_participant"
  on public.lesson_materials for select
  using (visible_to_students and public.is_lesson_participant(lesson_id));

-- Private bucket. Reads never go through Storage RLS at all - a server
-- action checks the (already-RLS-protected) metadata row first, then mints
-- a short-lived signed URL with the service-role key. That keeps the real
-- security boundary on the table policies above, which are easy to reason
-- about, instead of on storage.objects path-parsing policies, which are
-- the classic place a "guessed path" bug hides.
insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-files', 'lesson-files', false, 10485760);

create policy "lesson_files_tutor_insert"
  on storage.objects for insert
  with check (bucket_id = 'lesson-files' and public.is_tutor());

create policy "lesson_files_tutor_delete"
  on storage.objects for delete
  using (bucket_id = 'lesson-files' and public.is_tutor());
