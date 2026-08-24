-- Real password-based signup (email + password + full name + grade +
-- school) is being added, replacing the broken magic-link-only flow. The
-- signup form passes grade/grade_year/school_name through auth user
-- metadata (same fields already used for full_name), so handle_new_user
-- needs to read and store them too - this trigger fires on insert into
-- auth.users, before email confirmation, so the data is available
-- immediately.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_grade smallint;
  v_grade_year smallint;
  v_school_name text;
begin
  v_display_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name');
  v_grade := nullif(new.raw_user_meta_data ->> 'grade', '')::smallint;
  v_grade_year := nullif(new.raw_user_meta_data ->> 'grade_year', '')::smallint;
  v_school_name := nullif(new.raw_user_meta_data ->> 'school_name', '');

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    v_display_name,
    new.raw_user_meta_data ->> 'avatar_url',
    'student'
  );

  if new.email <> 'moto.eliran@gmail.com' then
    insert into public.students (profile_id, is_guest, claimed_at, display_name, grade, grade_year, school_name)
    values (
      new.id, false, now(), left(coalesce(v_display_name, new.email), 40),
      v_grade, v_grade_year, v_school_name
    );
  end if;

  return new;
end;
$$;
