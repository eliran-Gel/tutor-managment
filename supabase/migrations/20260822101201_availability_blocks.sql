-- Phase 4: availability blocks. MVP recurrence is intentionally limited to
-- "none" or "weekly" (repeats forever on the same day-of-week/time-range
-- starting from start_at) - see docs/IMPLEMENTATION_PLAN.md section L.

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  end_at timestamptz not null,
  recurrence_rule text check (recurrence_rule in ('weekly')),
  note text,
  created_at timestamptz not null default now(),
  constraint availability_blocks_valid_range check (end_at > start_at)
);

create index availability_blocks_start_idx on public.availability_blocks (start_at);
create index availability_blocks_end_idx on public.availability_blocks (end_at);

alter table public.availability_blocks enable row level security;

create policy "availability_blocks_tutor_all"
  on public.availability_blocks for all
  using (public.is_tutor())
  with check (public.is_tutor());

create policy "availability_blocks_select_authenticated"
  on public.availability_blocks for select
  using (auth.uid() is not null);
