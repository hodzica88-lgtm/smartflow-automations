-- 0035_add_public_inquiry_idempotency.sql
-- Enforce server-side public inquiry deduplication and bounded idempotency retention.

begin;

create table if not exists public.public_inquiry_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  idempotency_key text not null,
  request_hash text not null,
  lead_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,

  constraint public_inquiry_idempotency_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint public_inquiry_idempotency_key_not_blank
    check (btrim(idempotency_key) <> ''),
  constraint public_inquiry_idempotency_request_hash_not_blank
    check (btrim(request_hash) <> '')
);

alter table public.public_inquiry_idempotency_keys
  drop constraint if exists public_inquiry_idempotency_company_key_uniq;

drop index if exists public.public_inquiry_idempotency_company_key_uniq;

alter table public.public_inquiry_idempotency_keys
  add constraint public_inquiry_idempotency_company_key_uniq
  unique (company_id, idempotency_key);

create index if not exists public_inquiry_idempotency_company_expires_idx
  on public.public_inquiry_idempotency_keys (company_id, expires_at);

create or replace function public.create_public_inquiry_lead_with_notifications_idempotent(
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
  p_owner_new_lead_scheduled_for timestamptz,
  p_idempotency_key text,
  p_request_hash text,
  p_idempotency_ttl_hours integer default 24
)
returns table (
  lead_id uuid,
  company_id uuid,
  source text,
  duplicate boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing record;
  v_lead_id uuid;
  v_ttl_interval interval;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if p_source not in ('public_ai_chat', 'public_form') then
    raise exception 'invalid inquiry source';
  end if;

  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'idempotency key is required';
  end if;

  if p_request_hash is null or btrim(p_request_hash) = '' then
    raise exception 'request hash is required';
  end if;

  if p_idempotency_ttl_hours is null or p_idempotency_ttl_hours <= 0 then
    raise exception 'idempotency TTL must be positive';
  end if;

  v_ttl_interval := make_interval(hours => p_idempotency_ttl_hours);

  delete from public.public_inquiry_idempotency_keys
  where expires_at <= now();

  select *
    into v_existing
  from public.public_inquiry_idempotency_keys as pik
  where pik.company_id = p_company_id
    and pik.idempotency_key = p_idempotency_key
    and pik.expires_at > now()
  for update;

  if found then
    if v_existing.request_hash = p_request_hash then
      return query
      select v_existing.lead_id, p_company_id, p_source, true;
      return;
    end if;

    raise exception 'idempotency conflict for this request key' using errcode = '23505';
  end if;

  insert into public.public_inquiry_idempotency_keys (
    company_id,
    idempotency_key,
    request_hash,
    lead_id,
    expires_at
  )
  values (
    p_company_id,
    p_idempotency_key,
    p_request_hash,
    null,
    now() + v_ttl_interval
  )
  on conflict on constraint public_inquiry_idempotency_company_key_uniq
  do nothing;

  select *
    into v_existing
  from public.public_inquiry_idempotency_keys as pik
  where pik.company_id = p_company_id
    and pik.idempotency_key = p_idempotency_key
  for update;

  if found and v_existing.lead_id is not null and v_existing.request_hash = p_request_hash then
    return query
    select v_existing.lead_id, p_company_id, p_source, true;
    return;
  end if;

  if v_existing is not null and v_existing.request_hash <> p_request_hash then
    raise exception 'idempotency conflict for this request key' using errcode = '23505';
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

  update public.public_inquiry_idempotency_keys as pik
  set lead_id = v_lead_id,
      expires_at = now() + v_ttl_interval
  where pik.company_id = p_company_id
    and pik.idempotency_key = p_idempotency_key;

  return query
  select v_lead_id, p_company_id, p_source, false;
end;
$$;

revoke all on function public.create_public_inquiry_lead_with_notifications_idempotent(
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
  timestamptz,
  text,
  text,
  integer
) from public;
revoke all on function public.create_public_inquiry_lead_with_notifications_idempotent(
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
  timestamptz,
  text,
  text,
  integer
) from anon;
revoke all on function public.create_public_inquiry_lead_with_notifications_idempotent(
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
  timestamptz,
  text,
  text,
  integer
) from authenticated;
grant execute on function public.create_public_inquiry_lead_with_notifications_idempotent(
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
  timestamptz,
  text,
  text,
  integer
) to service_role;

commit;
