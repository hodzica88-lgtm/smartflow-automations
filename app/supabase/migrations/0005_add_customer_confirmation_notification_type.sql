-- 0005_add_customer_confirmation_notification_type.sql
-- Extend notification_queue to support customer confirmation emails.

begin;

alter table public.notification_queue
  drop constraint notification_queue_notification_type_check;

alter table public.notification_queue
  add constraint notification_queue_notification_type_check check (
    notification_type in ('owner_new_lead', 'customer_confirmation')
  );

create unique index notification_queue_company_lead_type_uniq
  on public.notification_queue (company_id, lead_id, notification_type);

commit;
