-- One-time hour additions: overrides the recurring weekly working-hours
-- window for a single specific date (e.g. "this Sunday only, 16:00-21:00
-- instead of the usual 17:00-21:00"), then automatically reverts to the
-- recurring default the following week - the inverse of
-- availability_blocks. One row per date (upserted on conflict) rather than
-- a list, since a date only ever has one effective override.

create table public.availability_additions (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  start_time time not null,
  end_time time not null,
  note text,
  created_at timestamptz not null default now(),
  constraint availability_additions_valid_range check (end_time > start_time)
);

create index availability_additions_date_idx on public.availability_additions (date);

alter table public.availability_additions enable row level security;

create policy "availability_additions_tutor_all"
  on public.availability_additions for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "availability_additions_select_authenticated"
  on public.availability_additions for select
  using (auth.uid() is not null);
