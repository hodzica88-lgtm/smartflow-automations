-- 0014_operator_company_overview.sql
-- Add a service-role-only aggregate view for the Varnito operator dashboard.

begin;

create or replace view public.operator_company_overview
with (security_invoker = true)
as
select
  company.id,
  company.name,
  company.email,
  company.created_at,
  company.deleted_at,
  coalesce(
    (
      select count(*)
      from public.users app_user
      where app_user.id = company.owner_user_id
         or app_user.default_company_id = company.id
    ),
    0
  )::bigint as user_count,
  coalesce(
    (
      select count(*)
      from public.leads lead
      where lead.company_id = company.id
        and lead.deleted_at is null
    ),
    0
  )::bigint as lead_count,
  (
    select max(lead.created_at)
    from public.leads lead
    where lead.company_id = company.id
      and lead.deleted_at is null
  ) as last_lead_at,
  coalesce(
    (
      select count(*)
      from public.notification_queue notification
      where notification.company_id = company.id
        and notification.status = 'failed'
        and notification.updated_at >= now() - interval '7 days'
    ),
    0
  )::bigint as failed_notifications_7d,
  coalesce(
    (
      select count(*)
      from public.notification_queue notification
      where notification.company_id = company.id
        and notification.status = 'pending'
        and notification.scheduled_for <= now()
    ),
    0
  )::bigint as due_notifications,
  coalesce(
    (
      select count(*)
      from public.notification_queue notification
      where notification.company_id = company.id
        and notification.status = 'processing'
        and notification.processing_started_at <= now() - interval '10 minutes'
    ),
    0
  )::bigint as stale_processing_notifications,
  subscription.plan as subscription_plan,
  subscription.status as subscription_status,
  subscription.current_period_end
from public.companies company
left join public.subscriptions subscription
  on subscription.company_id = company.id;

revoke all on table public.operator_company_overview from public;
revoke all on table public.operator_company_overview from anon;
revoke all on table public.operator_company_overview from authenticated;
grant select on table public.operator_company_overview to service_role;

commit;
