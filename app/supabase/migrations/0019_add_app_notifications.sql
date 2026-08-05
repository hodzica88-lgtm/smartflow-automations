create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  actor_user_id uuid references public.users (id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint app_notifications_type_check
    check (
      type in (
        'new_inquiry',
        'team_invited',
        'invite_accepted',
        'trial_ends_7_days',
        'trial_ends_tomorrow',
        'payment_failed',
        'subscription_canceled',
        'subscription_reactivated'
      )
    ),
  constraint app_notifications_dedupe_key_not_blank
    check (dedupe_key is null or btrim(dedupe_key) <> '')
);

create unique index if not exists app_notifications_dedupe_key_unique
  on public.app_notifications (company_id, type, dedupe_key)
  where dedupe_key is not null;

create index if not exists app_notifications_company_created_idx
  on public.app_notifications (company_id, created_at desc);

create index if not exists app_notifications_company_unread_idx
  on public.app_notifications (company_id, is_read, created_at desc);

create trigger set_app_notifications_updated_at
  before update on public.app_notifications
  for each row execute function public.set_updated_at();

alter table public.app_notifications enable row level security;

create policy app_notifications_select_company_access on public.app_notifications
  for select
  using (public.app_user_has_company_access(company_id));

create policy app_notifications_update_company_access on public.app_notifications
  for update
  using (public.app_user_has_company_access(company_id))
  with check (public.app_user_has_company_access(company_id));

grant select, insert, update, delete on public.app_notifications to service_role;