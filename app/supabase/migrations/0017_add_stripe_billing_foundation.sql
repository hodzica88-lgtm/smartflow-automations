alter table public.subscriptions
  add column if not exists stripe_price_id text,
  add column if not exists stripe_product_id text,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_used_at timestamptz,
  add column if not exists canceled_at timestamptz;

update public.subscriptions
set status = 'canceled'
where status = 'cancelled';

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (
    status in (
      'inactive',
      'trialing',
      'active',
      'past_due',
      'unpaid',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'paused'
    )
  );

update public.subscriptions
set
  trial_started_at = coalesce(trial_started_at, created_at),
  trial_ends_at = coalesce(trial_ends_at, created_at + interval '30 days'),
  trial_used_at = coalesce(trial_used_at, created_at),
  current_period_start = coalesce(current_period_start, created_at),
  current_period_end = coalesce(current_period_end, created_at + interval '30 days')
where status = 'trialing';

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null,
  stripe_event_type text not null,
  stripe_object_id text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stripe_webhook_events_event_id_unique unique (stripe_event_id),
  constraint stripe_webhook_events_type_not_empty check (btrim(stripe_event_type) <> '')
);

create index if not exists stripe_webhook_events_processed_idx
  on public.stripe_webhook_events (processed_at, created_at desc);

create trigger set_stripe_webhook_events_updated_at
  before update on public.stripe_webhook_events
  for each row execute function public.set_updated_at();

alter table public.stripe_webhook_events enable row level security;

grant select, insert, update, delete on public.stripe_webhook_events to service_role;