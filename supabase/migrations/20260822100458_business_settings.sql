-- Phase 3: business links (public-readable) and operational tutor settings
-- (tutor-only). Both are singleton tables (a single fixed row) since there
-- is exactly one tutor/business. See docs/IMPLEMENTATION_PLAN.md section C.

create table public.business_links (
  id boolean primary key default true,
  website_url text,
  community_url text,
  contact_info text,
  bit_link text,
  paybox_link text,
  updated_at timestamptz not null default now(),
  constraint business_links_singleton check (id)
);

alter table public.business_links enable row level security;

create policy "business_links_tutor_all"
  on public.business_links for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "business_links_select_authenticated"
  on public.business_links for select
  using (auth.uid() is not null);

create trigger business_links_set_updated_at
  before update on public.business_links
  for each row execute function public.set_updated_at();

insert into public.business_links (id) values (true);

create table public.tutor_settings (
  id boolean primary key default true,
  payment_reminder_days int not null default 3 check (payment_reminder_days > 0),
  default_lesson_duration int not null default 60 check (default_lesson_duration > 0),
  updated_at timestamptz not null default now(),
  constraint tutor_settings_singleton check (id)
);

alter table public.tutor_settings enable row level security;

create policy "tutor_settings_tutor_all"
  on public.tutor_settings for all
  using (public.is_tutor())
  with check (public.is_tutor());

create trigger tutor_settings_set_updated_at
  before update on public.tutor_settings
  for each row execute function public.set_updated_at();

insert into public.tutor_settings (id) values (true);
