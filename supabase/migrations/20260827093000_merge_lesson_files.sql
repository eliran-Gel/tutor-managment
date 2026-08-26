-- The separate lesson_summaries/lesson_materials split was an artificial
-- distinction the tutor doesn't want reflected in the upload flow - "one
-- piece of content per lesson" whether it's a photo or a document. Both
-- tables are still empty in production (feature shipped same day), so this
-- is a clean merge, not a data migration.

drop table public.lesson_summaries;
drop table public.lesson_materials;

create table public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  visible_to_students boolean not null default true,
  created_at timestamptz not null default now()
);

create index lesson_files_lesson_idx on public.lesson_files (lesson_id);

alter table public.lesson_files enable row level security;

create policy "lesson_files_tutor_all"
  on public.lesson_files for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "lesson_files_select_participant"
  on public.lesson_files for select
  using (visible_to_students and public.is_lesson_participant(lesson_id));
