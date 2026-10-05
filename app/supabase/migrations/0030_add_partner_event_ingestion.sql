begin;

create or replace function public.record_partner_event(
  p_partner_id uuid,
  p_event_id text,
  p_external_customer_id text,
  p_event_type text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_event_time timestamptz := coalesce(p_occurred_at, v_now);
  v_customer_id uuid;
  v_existing_event public.partner_events%rowtype;
  v_row_count int;
begin
  if p_partner_id is null then
    raise exception 'partner_id is required' using errcode = '23514';
  end if;

  if p_event_id is null or btrim(p_event_id) = '' then
    raise exception 'event_id is required' using errcode = '23514';
  end if;

  if p_external_customer_id is null or btrim(p_external_customer_id) = '' then
    raise exception 'external_customer_id is required' using errcode = '23514';
  end if;

  if p_event_type not in ('activated', 'deactivated', 'reactivated', 'billable_started', 'billable_stopped') then
    raise exception 'unsupported event type' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.partners where id = p_partner_id
  ) then
    raise exception 'partner not found' using errcode = '23503';
  end if;

  -- Serialize same-partner event processing for a clean event ledger.
  perform 1 from public.partners where id = p_partner_id for update;

  select *
    into v_existing_event
  from public.partner_events
  where partner_id = p_partner_id
    and event_id = p_event_id
  for update;

  if found then
    if v_existing_event.external_customer_id = p_external_customer_id
       and v_existing_event.event_type = p_event_type then
      return jsonb_build_object('ok', true, 'duplicate', true);
    end if;

    raise exception 'idempotency conflict for event_id %', p_event_id using errcode = '23505';
  end if;

  select id
    into v_customer_id
  from public.partner_customers
  where partner_id = p_partner_id
    and external_customer_id = p_external_customer_id
  for update;

  if p_event_type = 'activated' then
    if v_customer_id is null then
      insert into public.partner_customers (
        partner_id,
        external_customer_id,
        is_active,
        is_billable,
        activated_at,
        deactivated_at,
        billable_from,
        created_at,
        updated_at
      )
      values (
        p_partner_id,
        p_external_customer_id,
        true,
        false,
        v_event_time,
        null,
        null,
        v_now,
        v_now
      )
      returning id into v_customer_id;
    else
      update public.partner_customers
      set is_active = true,
          activated_at = coalesce(activated_at, v_event_time),
          deactivated_at = null,
          updated_at = v_now
      where partner_id = p_partner_id
        and id = v_customer_id;
    end if;

  elsif p_event_type = 'reactivated' then
    if v_customer_id is null then
      raise exception 'customer not found for reactivated event' using errcode = '23503';
    end if;

    update public.partner_customers
    set is_active = true,
        deactivated_at = null,
        updated_at = v_now
    where partner_id = p_partner_id
      and id = v_customer_id;

  elsif p_event_type = 'deactivated' then
    if v_customer_id is null then
      raise exception 'customer not found for deactivated event' using errcode = '23503';
    end if;

    update public.partner_customers
    set is_active = false,
        deactivated_at = coalesce(deactivated_at, v_event_time),
        updated_at = v_now
    where partner_id = p_partner_id
      and id = v_customer_id;

  elsif p_event_type = 'billable_started' then
    if v_customer_id is null then
      raise exception 'customer not found for billable_started event' using errcode = '23503';
    end if;

    update public.partner_customers
    set is_billable = true,
        billable_from = coalesce(billable_from, v_event_time),
        updated_at = v_now
    where partner_id = p_partner_id
      and id = v_customer_id;

  elsif p_event_type = 'billable_stopped' then
    if v_customer_id is null then
      raise exception 'customer not found for billable_stopped event' using errcode = '23503';
    end if;

    update public.partner_customers
    set is_billable = false,
        updated_at = v_now
    where partner_id = p_partner_id
      and id = v_customer_id;
  end if;

  insert into public.partner_events (
    partner_id,
    partner_customer_id,
    external_customer_id,
    event_id,
    event_type,
    occurred_at,
    received_at
  )
  values (
    p_partner_id,
    v_customer_id,
    p_external_customer_id,
    p_event_id,
    p_event_type,
    v_event_time,
    v_now
  );

  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then
    select *
      into v_existing_event
    from public.partner_events
    where partner_id = p_partner_id
      and event_id = p_event_id
    for update;

    if found and v_existing_event.external_customer_id = p_external_customer_id
       and v_existing_event.event_type = p_event_type then
      return jsonb_build_object('ok', true, 'duplicate', true);
    end if;

    raise exception 'idempotency conflict for event_id %', p_event_id using errcode = '23505';
  end if;

  return jsonb_build_object('ok', true, 'duplicate', false);
end;
$$;

revoke all on function public.record_partner_event(uuid, text, text, text, timestamptz) from public;
revoke all on function public.record_partner_event(uuid, text, text, text, timestamptz) from anon;
revoke all on function public.record_partner_event(uuid, text, text, text, timestamptz) from authenticated;
grant execute on function public.record_partner_event(uuid, text, text, text, timestamptz) to service_role;

commit;
