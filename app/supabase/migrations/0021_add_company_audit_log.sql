-- Audit trail for company-level operational changes.

begin;

create table if not exists public.company_audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  actor_user_id uuid,
  actor_label text not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint company_audit_log_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint company_audit_log_actor_user_id_fkey
    foreign key (actor_user_id)
    references public.users (id)
    on delete set null,
  constraint company_audit_log_action_not_empty check (btrim(action) <> ''),
  constraint company_audit_log_actor_label_not_empty check (btrim(actor_label) <> '')
);

create index if not exists company_audit_log_company_created_idx
  on public.company_audit_log (company_id, created_at desc);

alter table public.company_audit_log enable row level security;

drop policy if exists company_audit_log_select_owner on public.company_audit_log;
create policy company_audit_log_select_owner on public.company_audit_log
  for select
  using (exists (
    select 1
    from public.companies
    where id = company_id
      and owner_user_id = auth.uid()
      and deleted_at is null
  ));

drop policy if exists company_audit_log_insert_owner on public.company_audit_log;
create policy company_audit_log_insert_owner on public.company_audit_log
  for insert
  with check (true);

commit;