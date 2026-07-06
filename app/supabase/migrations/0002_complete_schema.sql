-- Add production-ready data model enhancements, soft delete support, and row-level security.

alter table public.companies
  add column deleted_at timestamptz;

alter table public.leads
  add column deleted_at timestamptz;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  lead_id uuid,
  assigned_user_id uuid,
  activity_type text not null default 'note',
  title text not null,
  details text,
  status text not null default 'pending',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint activities_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint activities_lead_id_fkey
    foreign key (lead_id, company_id)
    references public.leads (id, company_id)
    on delete set null,
  constraint activities_assigned_user_id_fkey
    foreign key (assigned_user_id)
    references public.users (id)
    on delete set null,
  constraint activities_type_not_empty check (btrim(activity_type) <> ''),
  constraint activities_title_not_empty check (btrim(title) <> ''),
  constraint activities_status_check check (status in ('pending', 'completed', 'cancelled')),
  constraint activities_completed_at_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index activities_company_id_idx on public.activities (company_id);
create index activities_lead_id_idx on public.activities (lead_id);
create index activities_assigned_user_id_idx on public.activities (assigned_user_id);
create index activities_company_id_status_due_at_idx on public.activities (company_id, status, due_at);

create trigger set_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create trigger set_lead_status_history_updated_at
  before update on public.lead_status_history
  for each row execute function public.set_updated_at();

create trigger set_reminders_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

create trigger set_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create trigger set_activities_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

create or replace function public.app_user_has_company_access(company_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.companies
    where id = company_id
      and owner_user_id = auth.uid()
      and deleted_at is null
  );
$$;

alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.leads enable row level security;
alter table public.lead_status_history enable row level security;
alter table public.reminders enable row level security;
alter table public.settings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.activities enable row level security;

create policy users_select_self on public.users
  for select
  using (auth.uid() = id);

create policy users_insert_self on public.users
  for insert
  with check (auth.uid() = id);

create policy users_update_self on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy users_delete_self on public.users
  for delete
  using (auth.uid() = id);

create policy companies_select_owner on public.companies
  for select
  using (owner_user_id = auth.uid() and deleted_at is null);

create policy companies_insert_owner on public.companies
  for insert
  with check (owner_user_id = auth.uid());

create policy companies_update_owner on public.companies
  for update
  using (owner_user_id = auth.uid() and deleted_at is null)
  with check (owner_user_id = auth.uid());

create policy companies_delete_owner on public.companies
  for delete
  using (owner_user_id = auth.uid());

create policy leads_select_company_access on public.leads
  for select
  using (public.app_user_has_company_access(company_id) and deleted_at is null);

create policy leads_insert_company_access on public.leads
  for insert
  with check (public.app_user_has_company_access(company_id));

create policy leads_update_company_access on public.leads
  for update
  using (public.app_user_has_company_access(company_id) and deleted_at is null)
  with check (public.app_user_has_company_access(company_id));

create policy leads_delete_company_access on public.leads
  for delete
  using (public.app_user_has_company_access(company_id));

create policy activities_select_company_access on public.activities
  for select
  using (public.app_user_has_company_access(company_id) and deleted_at is null);

create policy activities_insert_company_access on public.activities
  for insert
  with check (public.app_user_has_company_access(company_id));

create policy activities_update_company_access on public.activities
  for update
  using (public.app_user_has_company_access(company_id) and deleted_at is null)
  with check (public.app_user_has_company_access(company_id));

create policy activities_delete_company_access on public.activities
  for delete
  using (public.app_user_has_company_access(company_id));

create policy settings_select_company_access on public.settings
  for select
  using (public.app_user_has_company_access(company_id));

create policy settings_insert_company_access on public.settings
  for insert
  with check (public.app_user_has_company_access(company_id));

create policy settings_update_company_access on public.settings
  for update
  using (public.app_user_has_company_access(company_id))
  with check (public.app_user_has_company_access(company_id));

create policy settings_delete_company_access on public.settings
  for delete
  using (public.app_user_has_company_access(company_id));

create policy reminders_select_company_access on public.reminders
  for select
  using (public.app_user_has_company_access(company_id));

create policy reminders_insert_company_access on public.reminders
  for insert
  with check (public.app_user_has_company_access(company_id));

create policy reminders_update_company_access on public.reminders
  for update
  using (public.app_user_has_company_access(company_id))
  with check (public.app_user_has_company_access(company_id));

create policy reminders_delete_company_access on public.reminders
  for delete
  using (public.app_user_has_company_access(company_id));

create policy lead_status_history_select_company_access on public.lead_status_history
  for select
  using (public.app_user_has_company_access(company_id));

create policy lead_status_history_insert_company_access on public.lead_status_history
  for insert
  with check (public.app_user_has_company_access(company_id));

create policy lead_status_history_update_company_access on public.lead_status_history
  for update
  using (public.app_user_has_company_access(company_id))
  with check (public.app_user_has_company_access(company_id));

create policy lead_status_history_delete_company_access on public.lead_status_history
  for delete
  using (public.app_user_has_company_access(company_id));

create policy subscriptions_select_company_access on public.subscriptions
  for select
  using (public.app_user_has_company_access(company_id));

create policy subscriptions_insert_company_access on public.subscriptions
  for insert
  with check (public.app_user_has_company_access(company_id));

create policy subscriptions_update_company_access on public.subscriptions
  for update
  using (public.app_user_has_company_access(company_id))
  with check (public.app_user_has_company_access(company_id));

create policy subscriptions_delete_company_access on public.subscriptions
  for delete
  using (public.app_user_has_company_access(company_id));
