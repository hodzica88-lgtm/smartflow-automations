-- 0003_align_lead_workflow_with_specs.sql
-- Align leads schema with SMARTFLOW specs (statuses, outcomes, inquiry fields)
-- Additive and safe: adds columns, backfills values, then tightens constraints.

begin;

-- 1) Add outcome and inquiry columns if they do not already exist
alter table public.leads
  add column if not exists successful_outcome text;

alter table public.leads
  add column if not exists unsuccessful_outcome text;

alter table public.leads
  add column if not exists address text;

alter table public.leads
  add column if not exists inquiry_type text;

-- 2) Backfill status mappings from legacy values to SPEC values
-- Preserve existing data by mapping conservatively.
update public.leads
set
  successful_outcome = case when status = 'won' then 'job_won' else successful_outcome end,
  unsuccessful_outcome = case when status in ('lost','archived') then 'other' else unsuccessful_outcome end,
  status = case
    when status in ('qualified','proposal') then 'contacted'
    when status = 'won' then 'successful'
    when status in ('lost','archived') then 'unsuccessful'
    else status
  end
where status in ('qualified','proposal','won','lost','archived');

-- 3) Replace the existing status constraint with the SPEC-approved enum
alter table public.leads drop constraint if exists leads_status_check;

alter table public.leads
  add constraint leads_status_check check (status in ('new','contacted','successful','unsuccessful'));

-- 4) Add constraints for successful and unsuccessful outcome vocabularies
alter table public.leads
  add constraint leads_successful_outcome_check check (
    successful_outcome is null
    or successful_outcome in ('appointment_scheduled','offer_created','job_won')
  );

alter table public.leads
  add constraint leads_unsuccessful_outcome_check check (
    unsuccessful_outcome is null
    or unsuccessful_outcome in ('price_comparison','no_interest','unreachable','outside_service_area','too_expensive','other')
  );

-- 5) Ensure outcome/status consistency and mutual exclusivity
alter table public.leads
  add constraint leads_outcome_status_consistency_successful check (
    successful_outcome is null or status = 'successful'
  );

alter table public.leads
  add constraint leads_outcome_status_consistency_unsuccessful check (
    unsuccessful_outcome is null or status = 'unsuccessful'
  );

alter table public.leads
  add constraint leads_outcome_mutual_exclusive_check check (
    not (successful_outcome is not null and unsuccessful_outcome is not null)
  );

-- 6) Do not enforce NOT NULL on intake columns here — we've added columns to support the form.
--    Enforcement can be added in a later migration after backfill/cleanup.

commit;

-- End of migration
