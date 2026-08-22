-- Phase 1: profiles table, roles, auth trigger, RLS.
-- See docs/IMPLEMENTATION_PLAN.md sections C, D, E.

create type public.user_role as enum ('tutor', 'parent', 'student');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text,
  email text,
  phone text,
  avatar_url text,
  theme_preference text not null default 'system'
    check (theme_preference in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

-- Returns true when the calling session belongs to the tutor account.
-- security definer + fixed search_path so it can read `profiles` (which has
-- RLS enabled) without itself being subject to the very policies it backs,
-- and without being hijackable via a session-local search_path change.
create or replace function public.is_tutor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'tutor'
  );
$$;

-- Every authenticated user can read/update their own profile row.
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- The tutor has full access to every profile (needed to manage
-- parents/students from the tutor dashboard).
create policy "profiles_tutor_all"
  on public.profiles for all
  using (public.is_tutor())
  with check (public.is_tutor());

-- Auto-create a profile row whenever a new auth.users row appears, from
-- any provider (Google OAuth, email/password, magic link). Everyone
-- defaults to 'student'; the tutor's own account is promoted below.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    'student'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- One-time bootstrap: promote the tutor's own account to role='tutor' the
-- moment it exists. Safe to leave in place permanently (no-op once applied,
-- and re-applies correctly if the tutor's row is ever recreated).
create or replace function public.promote_configured_tutor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email = 'moto.eliran@gmail.com' then
    update public.profiles set role = 'tutor' where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_profile_created_promote_tutor
  after insert on public.profiles
  for each row execute function public.promote_configured_tutor();
