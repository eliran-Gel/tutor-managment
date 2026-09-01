-- Checklist item #2 (docs/BUSINESS_AUDIT_CHECKLIST.md): a lead form on the
-- public marketing site (a separate, unauthenticated static site) needs
-- somewhere to land. Unlike lesson requests, a lead isn't a registered
-- user at all yet - there's no profile, no auth.uid() to attach this to -
-- so this can't reuse the existing request tables, which all assume an
-- authenticated created_by.
--
-- No RLS policy exists for insert at all (not even for `anon`/
-- `authenticated`) - the only way a row gets created is the marketing
-- site's form posting to a Next.js API route that inserts with the
-- service-role key after its own validation, same pattern already used
-- for `notifications`. This keeps the public site from ever needing
-- direct database credentials of any kind.
create table public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  grade text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'dismissed')),
  created_at timestamptz not null default now()
);

create index marketing_leads_status_idx on public.marketing_leads (status);

alter table public.marketing_leads enable row level security;

create policy "marketing_leads_tutor_all"
  on public.marketing_leads for all
  using (public.is_tutor())
  with check (public.is_tutor());
