-- 0015_add_customer_value_settings.sql
-- Add optional customer-maintained values for honest business value and ROI reporting.

begin;

alter table public.settings
  add column if not exists average_order_value_cents integer,
  add column if not exists monthly_varnito_cost_cents integer;

alter table public.settings
  drop constraint if exists settings_average_order_value_cents_check;

alter table public.settings
  add constraint settings_average_order_value_cents_check check (
    average_order_value_cents is null
    or average_order_value_cents between 1 and 1000000000
  );

alter table public.settings
  drop constraint if exists settings_monthly_varnito_cost_cents_check;

alter table public.settings
  add constraint settings_monthly_varnito_cost_cents_check check (
    monthly_varnito_cost_cents is null
    or monthly_varnito_cost_cents between 1 and 100000000
  );

commit;
