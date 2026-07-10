-- 0007_add_companies_notification_email.sql
-- Add dedicated optional company notification email address.

begin;

alter table public.companies
  add column notification_email text;

commit;
