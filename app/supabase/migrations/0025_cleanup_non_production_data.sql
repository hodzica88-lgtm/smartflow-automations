-- Remove development, test, and load-test data before production launch.
-- FK analysis summary:
-- - Most runtime tables reference public.companies with on delete cascade.
-- - public.companies references public.users(owner_user_id) with on delete restrict, so companies must be removed before their users.
-- - public.users references auth.users(id) with on delete cascade, so auth users can be deleted last for full account cleanup.
-- - public.analytics_events keeps company_id with on delete set null, so matching analytics rows must be deleted before company deletion.

begin;

create temp table protected_user_ids on commit drop as
select u.id
from public.users as u
where lower(btrim(u.email)) = 'hodzica88@gmail.com';

create temp table candidate_company_ids on commit drop as
select distinct c.id
from public.companies as c
left join public.users as owner_user
  on owner_user.id = c.owner_user_id
where
  lower(coalesce(c.name, '')) ~ '(^|[^a-z])(test|demo|dev|staging|sample|dummy|load)([^a-z]|$)'
  or lower(coalesce(c.contact_person, '')) ~ '(^|[^a-z])(test|demo|dev|staging|sample|dummy|load)([^a-z]|$)'
  or lower(coalesce(c.email, '')) like any (array[
    '%@example.com',
    '%@example.org',
    '%@example.net',
    '%@example.invalid',
    '%@internal.local'
  ])
  or lower(coalesce(c.notification_email, '')) like any (array[
    '%@example.com',
    '%@example.org',
    '%@example.net',
    '%@example.invalid',
    '%@internal.local'
  ])
  or lower(coalesce(c.website_url, '')) like any (array[
    '%example.com%',
    '%example.org%',
    '%example.net%',
    '%example.invalid%',
    '%localhost%',
    '%127.0.0.1%'
  ])
  or lower(coalesce(owner_user.email, '')) like any (array[
    '%@example.com',
    '%@example.org',
    '%@example.net',
    '%@example.invalid',
    '%@internal.local'
  ])
  or lower(coalesce(owner_user.email, '')) ~ '(^|[^a-z0-9])(test|demo|dev|staging|sample|dummy|load)([^a-z0-9]|$)'
  or exists (
    select 1
    from public.leads as l
    where l.company_id = c.id
      and (
        lower(coalesce(l.source, '')) like 'load_test:%'
        or lower(coalesce(l.email, '')) like any (array[
          '%@example.com',
          '%@example.org',
          '%@example.net',
          '%@example.invalid'
        ])
        or lower(coalesce(l.notes, '')) like '%load test%'
        or lower(coalesce(l.notes, '')) like '%automated load test run%'
        or lower(coalesce(l.first_name, '')) = 'load'
        or lower(coalesce(l.last_name, '')) like 'test %'
      )
  )
  or exists (
    select 1
    from public.subscriptions as s
    where s.company_id = c.id
      and (
        coalesce(s.stripe_customer_id, '') like 'cus_test_%'
        or coalesce(s.stripe_subscription_id, '') like 'sub_test_%'
        or coalesce(s.stripe_price_id, '') like 'price_test_%'
        or coalesce(s.stripe_product_id, '') like 'prod_test_%'
      )
  )
  or exists (
    select 1
    from public.notification_queue as nq
    where nq.company_id = c.id
      and lower(coalesce(nq.error_message, '')) like '%load test%'
  );

create temp table candidate_user_ids on commit drop as
select distinct u.id
from public.users as u
left join protected_user_ids as protected
  on protected.id = u.id
where protected.id is null
  and (
    u.default_company_id in (select id from candidate_company_ids)
    or u.id in (
      select c.owner_user_id
      from public.companies as c
      where c.id in (select id from candidate_company_ids)
    )
    or lower(coalesce(u.email, '')) like any (array[
      '%@example.com',
      '%@example.org',
      '%@example.net',
      '%@example.invalid',
      '%@internal.local'
    ])
    or lower(coalesce(u.email, '')) ~ '(^|[^a-z0-9])(test|demo|dev|staging|sample|dummy|load)([^a-z0-9]|$)'
    or lower(coalesce(u.full_name, '')) ~ '(^|[^a-z])(test|demo|dev|staging|sample|dummy|load)([^a-z]|$)'
  );

create temp table candidate_stripe_object_ids on commit drop as
select distinct stripe_reference
from (
  select nullif(btrim(s.stripe_customer_id), '') as stripe_reference
  from public.subscriptions as s
  where s.company_id in (select id from candidate_company_ids)

  union all

  select nullif(btrim(s.stripe_subscription_id), '') as stripe_reference
  from public.subscriptions as s
  where s.company_id in (select id from candidate_company_ids)

  union all

  select nullif(btrim(s.stripe_price_id), '') as stripe_reference
  from public.subscriptions as s
  where s.company_id in (select id from candidate_company_ids)

  union all

  select nullif(btrim(s.stripe_product_id), '') as stripe_reference
  from public.subscriptions as s
  where s.company_id in (select id from candidate_company_ids)
) as refs
where stripe_reference is not null;

delete from public.analytics_events
where company_id in (select id from candidate_company_ids)
   or event_name = 'demo_entry'
   or lower(coalesce(metadata::text, '')) like any (array[
     '%load test%',
     '%localhost%',
     '%example.invalid%'
   ]);

delete from public.notification_queue;

delete from public.inquiry_rate_limits;

delete from public.action_rate_limits;

delete from public.stripe_webhook_events
where stripe_object_id in (select stripe_reference from candidate_stripe_object_ids)
   or stripe_event_id like 'evt_test_%'
   or coalesce(stripe_object_id, '') like any (array[
     'cs_test_%',
     'cus_test_%',
     'sub_test_%',
     'price_test_%',
     'prod_test_%'
   ]);

delete from public.companies
where id in (select id from candidate_company_ids);

delete from public.push_subscriptions
where company_id in (select id from candidate_company_ids)
   or user_id in (select id from candidate_user_ids);

delete from public.legal_acceptances
where company_id in (select id from candidate_company_ids)
   or user_id in (select id from candidate_user_ids);

delete from public.app_notifications
where company_id in (select id from candidate_company_ids);

delete from public.company_audit_log
where company_id in (select id from candidate_company_ids)
   or actor_user_id in (select id from candidate_user_ids);

delete from public.users
where id in (select id from candidate_user_ids);

delete from auth.users
where id in (select id from candidate_user_ids);

commit;