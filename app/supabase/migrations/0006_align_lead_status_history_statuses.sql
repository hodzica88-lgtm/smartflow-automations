-- 0006_align_lead_status_history_statuses.sql
-- Align lead_status_history status constraints with the current SmartFlow lead workflow.

begin;

alter table public.lead_status_history
  drop constraint if exists lead_status_history_from_status_check;

alter table public.lead_status_history
  drop constraint if exists lead_status_history_to_status_check;

alter table public.lead_status_history
  add constraint lead_status_history_from_status_check check (
    from_status is null
    or from_status in ('new','contacted','successful','unsuccessful')
  );

alter table public.lead_status_history
  add constraint lead_status_history_to_status_check check (
    to_status in ('new','contacted','successful','unsuccessful')
  );

commit;
