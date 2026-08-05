alter table public.subscriptions
  add column if not exists cancel_at timestamptz;

update public.subscriptions
set cancel_at = current_period_end
where cancel_at is null
  and cancel_at_period_end = true
  and current_period_end is not null;