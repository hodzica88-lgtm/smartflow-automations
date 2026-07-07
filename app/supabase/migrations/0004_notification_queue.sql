-- 0004_notification_queue.sql
-- Add internal notification queue support for owner notifications.

begin;

create table public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  lead_id uuid not null,
  notification_type text not null,
  status text not null default 'pending',
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_queue_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint notification_queue_lead_id_fkey
    foreign key (lead_id, company_id)
    references public.leads (id, company_id)
    on delete cascade,
  constraint notification_queue_notification_type_check check (
    notification_type in ('owner_new_lead')
  ),
  constraint notification_queue_status_check check (
    status in ('pending', 'sent', 'failed', 'cancelled')
  )
);

create index notification_queue_company_id_idx on public.notification_queue (company_id);
create index notification_queue_lead_id_idx on public.notification_queue (lead_id);
create index notification_queue_company_id_scheduled_for_idx on public.notification_queue (company_id, scheduled_for);

create trigger set_notification_queue_updated_at
  before update on public.notification_queue
  for each row execute function public.set_updated_at();

alter table public.notification_queue enable row level security;

create policy notification_queue_select_company_access on public.notification_queue
  for select
  using (public.app_user_has_company_access(company_id));

create policy notification_queue_insert_company_access on public.notification_queue
  for insert
  with check (public.app_user_has_company_access(company_id));

create policy notification_queue_update_company_access on public.notification_queue
  for update
  using (public.app_user_has_company_access(company_id))
  with check (public.app_user_has_company_access(company_id));

create policy notification_queue_delete_company_access on public.notification_queue
  for delete
  using (public.app_user_has_company_access(company_id));

grant select, insert, update, delete on public.notification_queue to service_role;

commit;
