-- 0013_add_push_subscriptions.sql
-- Store company-scoped Web Push subscriptions with owner-only access.

begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_name text,
  is_active boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint push_subscriptions_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint push_subscriptions_user_id_fkey
    foreign key (user_id)
    references public.users (id)
    on delete cascade,
  constraint push_subscriptions_endpoint_not_empty check (btrim(endpoint) <> ''),
  constraint push_subscriptions_endpoint_https_check check (btrim(endpoint) ~* '^https://'),
  constraint push_subscriptions_endpoint_length_check check (char_length(endpoint) <= 2048),
  constraint push_subscriptions_p256dh_not_empty check (btrim(p256dh) <> ''),
  constraint push_subscriptions_p256dh_length_check check (char_length(p256dh) <= 512),
  constraint push_subscriptions_auth_not_empty check (btrim(auth) <> ''),
  constraint push_subscriptions_auth_length_check check (char_length(auth) <= 512),
  constraint push_subscriptions_user_agent_length_check check (
    user_agent is null or char_length(user_agent) <= 1024
  ),
  constraint push_subscriptions_device_name_length_check check (
    device_name is null or char_length(device_name) <= 120
  ),
  constraint push_subscriptions_failure_count_check check (failure_count >= 0)
);

create unique index if not exists push_subscriptions_endpoint_unique_idx
  on public.push_subscriptions (endpoint);

create index if not exists push_subscriptions_company_active_idx
  on public.push_subscriptions (company_id, is_active, updated_at desc);

create index if not exists push_subscriptions_user_active_idx
  on public.push_subscriptions (user_id, is_active);

create trigger set_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_company_access on public.push_subscriptions
  for select
  using (public.app_user_has_company_access(company_id) and user_id = auth.uid());

create policy push_subscriptions_insert_company_access on public.push_subscriptions
  for insert
  with check (public.app_user_has_company_access(company_id) and user_id = auth.uid());

create policy push_subscriptions_update_company_access on public.push_subscriptions
  for update
  using (public.app_user_has_company_access(company_id) and user_id = auth.uid())
  with check (public.app_user_has_company_access(company_id) and user_id = auth.uid());

create policy push_subscriptions_delete_company_access on public.push_subscriptions
  for delete
  using (public.app_user_has_company_access(company_id) and user_id = auth.uid());

create or replace function public.increment_push_subscription_failure(
  p_subscription_id uuid,
  p_status_code integer default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_subscriptions
  set
    failure_count = failure_count + 1,
    last_failure_at = now(),
    updated_at = now(),
    is_active = case
      when p_status_code in (404, 410) then false
      else is_active
    end
  where id = p_subscription_id;
$$;

revoke all on function public.increment_push_subscription_failure(uuid, integer) from public;
revoke all on function public.increment_push_subscription_failure(uuid, integer) from anon;
revoke all on function public.increment_push_subscription_failure(uuid, integer) from authenticated;
grant execute on function public.increment_push_subscription_failure(uuid, integer) to service_role;

grant select, insert, update, delete on public.push_subscriptions to service_role;

commit;
