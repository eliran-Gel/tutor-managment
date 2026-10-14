-- Materials the tutor shares outside of any lesson: one stored file, shared
-- with any chosen set of students (or everyone, including students who join
-- later), and editable afterwards - recipients can be added/removed, the
-- file deleted. Replaces the one-file-per-student student_files table from
-- the previous migration (empty at the time this ran), which would have
-- stored the same worksheet once per student.

drop function if exists public.add_student_file(uuid, text, text, text);
drop table if exists public.student_files;

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null,
  mime_type text not null default 'application/octet-stream',
  -- true = visible to every student/parent account, including ones created
  -- after the file was shared; recipients below are then ignored.
  all_students boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.material_recipients (
  material_id uuid not null references public.materials (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  primary key (material_id, student_id)
);

create index material_recipients_student_idx on public.material_recipients (student_id);

alter table public.materials enable row level security;
alter table public.material_recipients enable row level security;

create policy "materials_select"
  on public.materials for select
  using (
    public.is_tutor()
    or (
      all_students
      and (
        exists (select 1 from public.students s where s.profile_id = auth.uid())
        or exists (select 1 from public.parent_students ps where ps.parent_profile_id = auth.uid())
      )
    )
    or exists (
      select 1 from public.material_recipients r
      where r.material_id = materials.id
        and (public.owns_student(r.student_id) or public.is_parent_of(r.student_id))
    )
  );

create policy "materials_update_tutor" on public.materials for update
  using (public.is_tutor()) with check (public.is_tutor());
create policy "materials_delete_tutor" on public.materials for delete
  using (public.is_tutor());

create policy "material_recipients_select"
  on public.material_recipients for select
  using (
    public.is_tutor()
    or public.owns_student(student_id)
    or public.is_parent_of(student_id)
  );

-- Everyone who should hear about new material for these students: the
-- student's own login and any linked parents.
create or replace function public.notify_material_audience(
  p_student_ids uuid[],
  p_file_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
begin
  for v_recipient in
    select s.profile_id from public.students s
    where s.id = any (p_student_ids) and s.profile_id is not null
    union
    select ps.parent_profile_id from public.parent_students ps
    where ps.student_id = any (p_student_ids)
  loop
    perform public.create_notification(
      v_recipient, 'lesson_file_uploaded', 'הועלה חומר עזר חדש', p_file_name, '/portal/materials'
    );
  end loop;
end;
$$;

revoke all on function public.notify_material_audience(uuid[], text) from public, anon, authenticated;

create or replace function public.create_material(
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_all boolean,
  p_student_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_targets uuid[];
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can share materials';
  end if;
  if not p_all and coalesce(array_length(p_student_ids, 1), 0) = 0 then
    raise exception 'choose at least one student, or share with everyone';
  end if;

  insert into public.materials (file_name, storage_path, mime_type, all_students)
  values (p_file_name, p_storage_path, coalesce(nullif(p_mime_type, ''), 'application/octet-stream'), p_all)
  returning id into v_id;

  if not p_all then
    insert into public.material_recipients (material_id, student_id)
    select v_id, unnest(p_student_ids)
    on conflict do nothing;
  end if;

  v_targets := case
    when p_all then array(select id from public.students where archived_at is null)
    else p_student_ids
  end;
  perform public.notify_material_audience(v_targets, p_file_name);

  return v_id;
end;
$$;

-- Replaces who a material is shared with. Only people who weren't already
-- covered get a notification, so editing the list doesn't re-notify
-- everyone.
create or replace function public.set_material_recipients(
  p_material_id uuid,
  p_all boolean,
  p_student_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material public.materials;
  v_old uuid[];
  v_new uuid[];
begin
  if not public.is_tutor() then
    raise exception 'only the tutor can change sharing';
  end if;
  if not p_all and coalesce(array_length(p_student_ids, 1), 0) = 0 then
    raise exception 'choose at least one student, or share with everyone';
  end if;

  select * into v_material from public.materials where id = p_material_id for update;
  if not found then
    raise exception 'material not found';
  end if;

  v_old := case
    when v_material.all_students then array(select id from public.students where archived_at is null)
    else array(select student_id from public.material_recipients where material_id = p_material_id)
  end;

  update public.materials set all_students = p_all where id = p_material_id;
  delete from public.material_recipients where material_id = p_material_id;

  if not p_all then
    insert into public.material_recipients (material_id, student_id)
    select p_material_id, unnest(p_student_ids)
    on conflict do nothing;
  end if;

  v_new := case
    when p_all then array(select id from public.students where archived_at is null)
    else p_student_ids
  end;

  perform public.notify_material_audience(
    array(select unnest(v_new) except select unnest(v_old)),
    v_material.file_name
  );
end;
$$;

revoke all on function public.create_material(text, text, text, boolean, uuid[]) from public, anon;
revoke all on function public.set_material_recipients(uuid, boolean, uuid[]) from public, anon;
grant execute on function public.create_material(text, text, text, boolean, uuid[]) to authenticated;
grant execute on function public.set_material_recipients(uuid, boolean, uuid[]) to authenticated;
