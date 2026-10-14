-- Materials the tutor shares with one student (and their parents) on an
-- ongoing basis, independent of any lesson. Lesson files (lesson_files)
-- only reach the students who took part in that specific lesson, so there
-- was no way to hand someone a worksheet "just because". Stored in the
-- same private lesson-files bucket (tutor-only writes, reads via signed
-- URLs minted server-side after this table's RLS lets the caller see the
-- row) - see src/lib/lesson-files.ts.

create table public.student_files (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text not null default 'application/octet-stream',
  visible_to_students boolean not null default true,
  created_at timestamptz not null default now()
);

create index student_files_student_id_idx on public.student_files (student_id, created_at desc);

alter table public.student_files enable row level security;

create policy "student_files_select"
  on public.student_files for select
  using (
    public.is_tutor()
    or (
      visible_to_students
      and (public.owns_student(student_id) or public.is_parent_of(student_id))
    )
  );

create policy "student_files_update_tutor"
  on public.student_files for update
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "student_files_delete_tutor"
  on public.student_files for delete
  using (public.is_tutor());

-- Insert goes through this function (not a bare INSERT policy) so the
-- student and their parents get notified in the same step, exactly like
-- confirm_lesson_file_upload does for lesson files.
create or replace function public.add_student_file(
  p_student_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text
)
returns public.student_files
language plpgsql
security definer
set search_path = public
as $$
declare
  v_file public.student_files;
  v_recipient uuid;
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can add student files';
  end if;

  insert into public.student_files (student_id, file_name, storage_path, mime_type)
  values (p_student_id, p_file_name, p_storage_path, coalesce(nullif(p_mime_type, ''), 'application/octet-stream'))
  returning * into v_file;

  for v_recipient in
    select s.profile_id from public.students s
    where s.id = p_student_id and s.profile_id is not null
    union
    select ps.parent_profile_id from public.parent_students ps
    where ps.student_id = p_student_id
  loop
    perform public.create_notification(
      v_recipient, 'lesson_file_uploaded', 'הועלה חומר עזר חדש',
      p_file_name,
      '/portal/materials'
    );
  end loop;

  return v_file;
end;
$$;

revoke all on function public.add_student_file(uuid, text, text, text) from public, anon;
grant execute on function public.add_student_file(uuid, text, text, text) to authenticated;
