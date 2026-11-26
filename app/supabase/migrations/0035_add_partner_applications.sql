begin;

create extension if not exists pgcrypto;

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text not null,
  email text not null,
  website text null,
  country text not null,
  description text not null,
  privacy_accepted boolean not null default false,
  source text not null default 'public_form',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partner_applications_full_name_not_empty check (btrim(full_name) <> ''),
  constraint partner_applications_company_name_not_empty check (btrim(company_name) <> ''),
  constraint partner_applications_email_not_empty check (btrim(email) <> ''),
  constraint partner_applications_country_not_empty check (btrim(country) <> ''),
  constraint partner_applications_description_not_empty check (btrim(description) <> ''),
  constraint partner_applications_source_check check (source in ('public_form', 'manual', 'partner_referral', 'owner_invite')),
  constraint partner_applications_status_check check (status in ('new', 'in_review', 'contacted', 'accepted', 'rejected'))
);

create index if not exists partner_applications_created_at_idx
  on public.partner_applications (created_at desc);

create index if not exists partner_applications_status_created_at_idx
  on public.partner_applications (status, created_at desc);

alter table public.partner_applications enable row level security;

revoke all on table public.partner_applications from public;
revoke all on table public.partner_applications from anon;
revoke all on table public.partner_applications from authenticated;
grant select, insert, update on table public.partner_applications to service_role;

commit;
