begin;

create extension if not exists pgcrypto;

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  partner_key text not null unique,
  name text not null,
  status text not null default 'pending',
  billing_model text not null default 'per_customer',
  price_per_customer_minor bigint null,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partners_partner_key_not_empty check (btrim(partner_key) <> ''),
  constraint partners_partner_key_length check (char_length(partner_key) <= 64),
  constraint partners_partner_key_format check (partner_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  constraint partners_name_not_empty check (btrim(name) <> ''),
  constraint partners_status_check check (status in ('pending', 'active', 'paused', 'terminated')),
  constraint partners_billing_model_check check (billing_model in ('per_customer', 'flat', 'tiered', 'custom')),
  constraint partners_price_per_customer_minor_nonnegative check (
    price_per_customer_minor is null or price_per_customer_minor >= 0
  ),
  constraint partners_currency_check check (currency ~ '^[A-Z]{3}$')
);

create table if not exists public.partner_credentials (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  key_id uuid not null default gen_random_uuid(),
  secret_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz null,
  revoked_at timestamptz null,

  constraint partner_credentials_partner_id_fkey
    foreign key (partner_id)
    references public.partners (id)
    on delete restrict,
  constraint partner_credentials_key_id_unique unique (key_id),
  constraint partner_credentials_secret_hash_not_empty check (btrim(secret_hash) <> '')
);

create table if not exists public.partner_customers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  external_customer_id text not null,
  is_active boolean not null default true,
  is_billable boolean not null default false,
  activated_at timestamptz not null default now(),
  billable_from timestamptz null,
  deactivated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partner_customers_partner_id_fkey
    foreign key (partner_id)
    references public.partners (id)
    on delete restrict,
  constraint partner_customers_partner_external_customer_unique unique (partner_id, external_customer_id),
  constraint partner_customers_partner_partner_id_id_unique unique (partner_id, id),
  constraint partner_customers_external_customer_id_not_empty check (btrim(external_customer_id) <> ''),
  constraint partner_customers_external_customer_id_length check (char_length(external_customer_id) <= 128)
);

create table if not exists public.partner_events (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  partner_customer_id uuid null,
  external_customer_id text not null,
  event_id text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),

  constraint partner_events_partner_id_fkey
    foreign key (partner_id)
    references public.partners (id)
    on delete restrict,
  constraint partner_events_partner_customer_id_fkey
    foreign key (partner_id, partner_customer_id)
    references public.partner_customers (partner_id, id)
    on delete restrict,
  constraint partner_events_partner_event_id_unique unique (partner_id, event_id),
  constraint partner_events_event_id_not_empty check (btrim(event_id) <> ''),
  constraint partner_events_event_id_length check (char_length(event_id) <= 128),
  constraint partner_events_external_customer_id_not_empty check (btrim(external_customer_id) <> ''),
  constraint partner_events_external_customer_id_length check (char_length(external_customer_id) <= 128),
  constraint partner_events_event_type_check check (
    event_type in ('activated', 'deactivated', 'reactivated', 'billable_started', 'billable_stopped')
  )
);

create index if not exists partner_credentials_partner_id_idx
  on public.partner_credentials (partner_id);

create index if not exists partner_credentials_active_partner_idx
  on public.partner_credentials (partner_id)
  where revoked_at is null;

create index if not exists partner_customers_partner_id_idx
  on public.partner_customers (partner_id);

create index if not exists partner_customers_partner_active_idx
  on public.partner_customers (partner_id, is_active);

create index if not exists partner_customers_partner_billable_idx
  on public.partner_customers (partner_id, is_billable);

create index if not exists partner_events_partner_received_idx
  on public.partner_events (partner_id, received_at desc);

create index if not exists partner_events_partner_type_received_idx
  on public.partner_events (partner_id, event_type, received_at desc);

create index if not exists partner_events_partner_external_customer_received_idx
  on public.partner_events (partner_id, external_customer_id, received_at desc);

alter table public.partners enable row level security;
alter table public.partner_credentials enable row level security;
alter table public.partner_customers enable row level security;
alter table public.partner_events enable row level security;

revoke all on table public.partners from public;
revoke all on table public.partners from anon;
revoke all on table public.partners from authenticated;
grant select, insert, update on table public.partners to service_role;

revoke all on table public.partner_credentials from public;
revoke all on table public.partner_credentials from anon;
revoke all on table public.partner_credentials from authenticated;
grant select, insert, update on table public.partner_credentials to service_role;

revoke all on table public.partner_customers from public;
revoke all on table public.partner_customers from anon;
revoke all on table public.partner_customers from authenticated;
grant select, insert, update on table public.partner_customers to service_role;

revoke all on table public.partner_events from public;
revoke all on table public.partner_events from anon;
revoke all on table public.partner_events from authenticated;
grant select, insert on table public.partner_events to service_role;

commit;
