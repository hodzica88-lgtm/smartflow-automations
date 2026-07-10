-- 0012_add_company_inquiry_types.sql
-- Add company-scoped inquiry type catalog with owner-only RLS access.

begin;

create table if not exists public.company_inquiry_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  name text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint company_inquiry_types_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint company_inquiry_types_name_not_empty check (btrim(name) <> '')
);

create unique index if not exists company_inquiry_types_company_name_ci_uniq
  on public.company_inquiry_types (company_id, lower(btrim(name)));

create index if not exists company_inquiry_types_company_active_sort_idx
  on public.company_inquiry_types (company_id, active, sort_order);

create trigger set_company_inquiry_types_updated_at
  before update on public.company_inquiry_types
  for each row execute function public.set_updated_at();

alter table public.company_inquiry_types enable row level security;

create policy company_inquiry_types_select_company_access on public.company_inquiry_types
  for select
  using (public.app_user_has_company_access(company_id));

create policy company_inquiry_types_insert_company_access on public.company_inquiry_types
  for insert
  with check (public.app_user_has_company_access(company_id));

create policy company_inquiry_types_update_company_access on public.company_inquiry_types
  for update
  using (public.app_user_has_company_access(company_id))
  with check (public.app_user_has_company_access(company_id));

create policy company_inquiry_types_delete_company_access on public.company_inquiry_types
  for delete
  using (public.app_user_has_company_access(company_id));

grant select, insert, update, delete on public.company_inquiry_types to service_role;

commit;
