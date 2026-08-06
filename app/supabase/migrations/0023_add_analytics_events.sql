-- Anonymous product analytics events for funnel and operations reporting.
-- This table intentionally stores no direct personal data (no email, phone, or names).

begin;

create table if not exists public.analytics_events (
  id bigserial primary key,
  event_name text not null,
  market text not null,
  company_id uuid null,
  is_authenticated boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),

  constraint analytics_events_event_name_not_empty check (btrim(event_name) <> ''),
  constraint analytics_events_market_valid check (market in ('de', 'us', 'unknown')),
  constraint analytics_events_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete set null
);

create index if not exists analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at desc);

create index if not exists analytics_events_event_name_occurred_at_idx
  on public.analytics_events (event_name, occurred_at desc);

create index if not exists analytics_events_market_occurred_at_idx
  on public.analytics_events (market, occurred_at desc);

create index if not exists analytics_events_company_occurred_at_idx
  on public.analytics_events (company_id, occurred_at desc)
  where company_id is not null;

alter table public.analytics_events enable row level security;

-- No direct policies: service-role writes/reads only.

commit;
