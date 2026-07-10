-- 0008_harden_notification_queue_processing.sql
-- Harden notification queue processing for concurrent workers and crash recovery.

begin;

alter table public.notification_queue
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists provider_message_id text;

alter table public.notification_queue
  drop constraint if exists notification_queue_status_check;

alter table public.notification_queue
  add constraint notification_queue_status_check check (
    status in ('pending', 'processing', 'sent', 'failed', 'cancelled')
  );

create index if not exists notification_queue_status_scheduled_for_idx
  on public.notification_queue (status, scheduled_for);

create or replace function public.claim_notification_queue_items(p_batch_size integer default 25)
returns table (
  id uuid,
  company_id uuid,
  lead_id uuid,
  notification_type text,
  status text,
  scheduled_for timestamptz,
  attempt_count integer,
  last_attempt_at timestamptz,
  processing_started_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := now();
  v_batch_size integer := least(greatest(coalesce(p_batch_size, 25), 1), 100);
begin
  return query
  with due as (
    select q.id
    from public.notification_queue q
    where (
      (q.status = 'pending' and q.scheduled_for <= v_now)
      or (q.status = 'processing' and q.processing_started_at <= (v_now - interval '10 minutes'))
    )
    order by q.scheduled_for asc, q.created_at asc
    for update skip locked
    limit v_batch_size
  )
  update public.notification_queue q
  set
    status = 'processing',
    attempt_count = q.attempt_count + 1,
    last_attempt_at = v_now,
    processing_started_at = v_now,
    updated_at = v_now
  from due
  where q.id = due.id
  returning
    q.id,
    q.company_id,
    q.lead_id,
    q.notification_type,
    q.status,
    q.scheduled_for,
    q.attempt_count,
    q.last_attempt_at,
    q.processing_started_at;
end;
$$;

revoke all on function public.claim_notification_queue_items(integer) from public;
revoke all on function public.claim_notification_queue_items(integer) from anon;
revoke all on function public.claim_notification_queue_items(integer) from authenticated;
grant execute on function public.claim_notification_queue_items(integer) to service_role;

commit;
