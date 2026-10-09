-- 0033_add_atomic_public_inquiry_lead_creation.sql
-- Create an atomic public lead + notification queue write so queue failures cannot leave a persisted lead without its required notifications.

begin;

create or replace function public.create_public_inquiry_lead_with_notifications(
  p_company_id uuid,
  p_first_name text,
  p_last_name text,
  p_address text,
  p_phone text,
  p_email text,
  p_inquiry_type text,
  p_source text,
  p_notes text,
  p_customer_confirmation_scheduled_for timestamptz,
  p_owner_new_lead_scheduled_for timestamptz
)
returns table (
  lead_id uuid,
  company_id uuid,
  source text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lead_id uuid;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if p_source not in ('public_ai_chat', 'public_form') then
    raise exception 'invalid inquiry source';
  end if;

  insert into public.leads (
    company_id,
    first_name,
    last_name,
    address,
    phone,
    email,
    inquiry_type,
    source,
    status,
    notes
  )
  values (
    p_company_id,
    nullif(btrim(p_first_name), ''),
    nullif(btrim(p_last_name), ''),
    nullif(btrim(p_address), ''),
    nullif(btrim(p_phone), ''),
    nullif(btrim(lower(p_email)), ''),
    nullif(btrim(p_inquiry_type), ''),
    p_source,
    'new',
    p_notes
  )
  returning id into v_lead_id;

  insert into public.notification_queue (
    company_id,
    lead_id,
    notification_type,
    status,
    scheduled_for
  )
  values
    (p_company_id, v_lead_id, 'owner_new_lead', 'pending', p_owner_new_lead_scheduled_for),
    (p_company_id, v_lead_id, 'customer_confirmation', 'pending', p_customer_confirmation_scheduled_for);

  return query
  select v_lead_id, p_company_id, p_source;
end;
$$;

revoke all on function public.create_public_inquiry_lead_with_notifications(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz
) from public;
revoke all on function public.create_public_inquiry_lead_with_notifications(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz
) from anon;
revoke all on function public.create_public_inquiry_lead_with_notifications(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz
) from authenticated;
grant execute on function public.create_public_inquiry_lead_with_notifications(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz
) to service_role;

commit;
