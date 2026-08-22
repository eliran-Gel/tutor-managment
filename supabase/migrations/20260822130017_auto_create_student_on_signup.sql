-- Product decision (from real usage): a student should be able to
-- register themselves and immediately request/receive lessons, without
-- the tutor first manually creating a guest row for them. Every new
-- signup now gets a linked `students` row automatically (is_guest=false,
-- claimed_at=now()), except the configured tutor account.
--
-- The tutor still sets default_price afterward (approve_lesson_request
-- already requires it before a request can be approved), and the
-- guest-student path (tutor creates a student with no account, claimed
-- later) is unchanged - this just adds the reverse path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name');

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    v_display_name,
    new.raw_user_meta_data ->> 'avatar_url',
    'student'
  );

  if new.email <> 'moto.eliran@gmail.com' then
    insert into public.students (profile_id, is_guest, claimed_at, display_name)
    values (new.id, false, now(), coalesce(v_display_name, new.email));
  end if;

  return new;
end;
$$;
