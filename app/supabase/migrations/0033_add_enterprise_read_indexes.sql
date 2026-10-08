-- Enterprise-readiness indexes for the highest-volume dashboard read paths.

create index if not exists leads_company_active_created_at_idx
  on public.leads (company_id, created_at desc)
  where deleted_at is null;

create index if not exists leads_company_active_assigned_created_at_idx
  on public.leads (company_id, assigned_user_id, created_at desc)
  where deleted_at is null;

create index if not exists lead_status_history_company_lead_created_at_idx
  on public.lead_status_history (company_id, lead_id, created_at desc);
