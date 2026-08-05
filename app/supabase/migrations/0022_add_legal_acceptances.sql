-- Captured acceptance for terms and privacy at checkout.

begin;

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id uuid not null,
  consent_scope text not null,
  accepted_documents text[] not null default '{}'::text[],
  accepted_version text not null,
  source_path text not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint legal_acceptances_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint legal_acceptances_user_id_fkey
    foreign key (user_id)
    references public.users (id)
    on delete cascade,
  constraint legal_acceptances_scope_not_empty check (btrim(consent_scope) <> ''),
  constraint legal_acceptances_version_not_empty check (btrim(accepted_version) <> ''),
  constraint legal_acceptances_source_path_not_empty check (btrim(source_path) <> '')
);

create index if not exists legal_acceptances_company_created_idx
  on public.legal_acceptances (company_id, accepted_at desc);

alter table public.legal_acceptances enable row level security;

drop policy if exists legal_acceptances_select_owner on public.legal_acceptances;
create policy legal_acceptances_select_owner on public.legal_acceptances
  for select
  using (exists (
    select 1
    from public.companies
    where id = company_id
      and owner_user_id = auth.uid()
      and deleted_at is null
  ));

commit;