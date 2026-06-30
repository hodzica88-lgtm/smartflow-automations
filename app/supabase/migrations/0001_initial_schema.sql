create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'owner',
  default_company_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint users_email_not_empty check (btrim(email) <> ''),
  constraint users_role_check check (role in ('owner', 'admin', 'member'))
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  name text not null,
  website_url text,
  phone text,
  industry text,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint companies_owner_user_id_fkey
    foreign key (owner_user_id)
    references public.users (id)
    on delete restrict,
  constraint companies_name_not_empty check (btrim(name) <> ''),
  constraint companies_timezone_not_empty check (btrim(timezone) <> '')
);

alter table public.users
  add constraint users_default_company_id_fkey
  foreign key (default_company_id)
  references public.companies (id)
  on delete set null;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  assigned_user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  company_name text,
  source text not null,
  status text not null default 'new',
  priority text not null default 'normal',
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint leads_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint leads_assigned_user_id_fkey
    foreign key (assigned_user_id)
    references public.users (id)
    on delete set null,
  constraint leads_source_not_empty check (btrim(source) <> ''),
  constraint leads_status_check check (
    status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'archived')
  ),
  constraint leads_priority_check check (priority in ('low', 'normal', 'high', 'urgent')),
  constraint leads_id_company_id_unique unique (id, company_id),
  constraint leads_contact_present_check check (
    btrim(coalesce(email, '')) <> ''
    or btrim(coalesce(phone, '')) <> ''
    or btrim(coalesce(company_name, '')) <> ''
  )
);

create table public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  company_id uuid not null,
  changed_by_user_id uuid,
  from_status text,
  to_status text not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lead_status_history_lead_id_fkey
    foreign key (lead_id, company_id)
    references public.leads (id, company_id)
    on delete cascade,
  constraint lead_status_history_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint lead_status_history_changed_by_user_id_fkey
    foreign key (changed_by_user_id)
    references public.users (id)
    on delete set null,
  constraint lead_status_history_from_status_check check (
    from_status is null
    or from_status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'archived')
  ),
  constraint lead_status_history_to_status_check check (
    to_status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'archived')
  ),
  constraint lead_status_history_status_changed_check check (
    from_status is null
    or from_status <> to_status
  )
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  lead_id uuid,
  assigned_user_id uuid not null,
  title text not null,
  description text,
  due_at timestamptz not null,
  status text not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reminders_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint reminders_lead_id_fkey
    foreign key (lead_id, company_id)
    references public.leads (id, company_id)
    on delete cascade,
  constraint reminders_assigned_user_id_fkey
    foreign key (assigned_user_id)
    references public.users (id)
    on delete restrict,
  constraint reminders_title_not_empty check (btrim(title) <> ''),
  constraint reminders_status_check check (status in ('pending', 'completed', 'snoozed', 'cancelled')),
  constraint reminders_completed_at_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  lead_auto_assign_enabled boolean not null default false,
  default_lead_source text not null default 'website',
  reminder_default_hours integer not null default 24,
  brevo_enabled boolean not null default false,
  make_enabled boolean not null default false,
  stripe_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint settings_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint settings_company_id_unique unique (company_id),
  constraint settings_default_lead_source_not_empty check (btrim(default_lead_source) <> ''),
  constraint settings_reminder_default_hours_check check (reminder_default_hours >= 0)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscriptions_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint subscriptions_company_id_unique unique (company_id),
  constraint subscriptions_plan_check check (plan in ('free', 'starter', 'growth', 'pro')),
  constraint subscriptions_status_check check (
    status in ('inactive', 'trialing', 'active', 'past_due', 'cancelled', 'unpaid')
  ),
  constraint subscriptions_current_period_check check (
    current_period_start is null
    or current_period_end is null
    or current_period_end > current_period_start
  )
);

create unique index users_email_normalized_unique_idx on public.users (lower(btrim(email)));
create index users_default_company_id_idx on public.users (default_company_id);

create index companies_owner_user_id_idx on public.companies (owner_user_id);
create index companies_name_idx on public.companies (name);

create index leads_company_id_idx on public.leads (company_id);
create index leads_assigned_user_id_idx on public.leads (assigned_user_id);
create index leads_company_id_status_idx on public.leads (company_id, status);
create index leads_company_id_created_at_idx on public.leads (company_id, created_at);
create index leads_company_id_updated_at_idx on public.leads (company_id, updated_at);
create index leads_email_idx on public.leads (email);
create index leads_phone_idx on public.leads (phone);

create index lead_status_history_lead_id_idx on public.lead_status_history (lead_id);
create index lead_status_history_company_id_idx on public.lead_status_history (company_id);
create index lead_status_history_company_id_created_at_idx
  on public.lead_status_history (company_id, created_at);
create index lead_status_history_lead_id_created_at_idx
  on public.lead_status_history (lead_id, created_at);
create index lead_status_history_changed_by_user_id_idx
  on public.lead_status_history (changed_by_user_id);

create index reminders_company_id_idx on public.reminders (company_id);
create index reminders_lead_id_idx on public.reminders (lead_id);
create index reminders_assigned_user_id_idx on public.reminders (assigned_user_id);
create index reminders_assigned_user_id_status_due_at_idx
  on public.reminders (assigned_user_id, status, due_at);
create index reminders_company_id_status_due_at_idx
  on public.reminders (company_id, status, due_at);

create unique index subscriptions_stripe_customer_id_unique_idx
  on public.subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;
create unique index subscriptions_stripe_subscription_id_unique_idx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;
create index subscriptions_status_current_period_end_idx
  on public.subscriptions (status, current_period_end);

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

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

alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.leads enable row level security;
alter table public.lead_status_history enable row level security;
alter table public.reminders enable row level security;
alter table public.settings enable row level security;
alter table public.subscriptions enable row level security;
