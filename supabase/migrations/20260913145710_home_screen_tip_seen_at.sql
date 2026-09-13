-- Tracks whether a user has already seen the "add to home screen" tip
-- popup (shown once automatically, then re-watchable from settings).
-- Null = not shown/dismissed yet, matching the read_at/dismissed_at
-- nullable-timestamp convention already used elsewhere in this schema.
alter table public.profiles
  add column home_screen_tip_seen_at timestamptz;
