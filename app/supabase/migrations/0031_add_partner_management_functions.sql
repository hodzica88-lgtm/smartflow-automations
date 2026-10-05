begin;

create or replace function public.terminate_partner(
  p_partner_id uuid
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_status text;
begin
  if p_partner_id is null then
    raise exception 'partner_id is required' using errcode = '23514';
  end if;

  select status
    into v_status
  from public.partners
  where id = p_partner_id
  for update;

  if not found then
    raise exception 'partner not found' using errcode = '23503';
  end if;

  if v_status = 'terminated' then
    update public.partner_credentials
    set revoked_at = coalesce(revoked_at, now())
    where partner_id = p_partner_id
      and revoked_at is null;

    return jsonb_build_object('ok', true, 'status', 'terminated', 'credentials_revoked', true);
  end if;

  update public.partners
  set status = 'terminated', updated_at = now()
  where id = p_partner_id;

  update public.partner_credentials
  set revoked_at = coalesce(revoked_at, now())
  where partner_id = p_partner_id
    and revoked_at is null;

  return jsonb_build_object('ok', true, 'status', 'terminated', 'credentials_revoked', true);
end;
$$;

create or replace function public.rotate_partner_credential(
  p_partner_id uuid,
  p_old_credential_id uuid,
  p_new_key_id uuid,
  p_new_secret_hash text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_partner_status text;
  v_old_record public.partner_credentials%rowtype;
  v_new_id uuid;
begin
  if p_partner_id is null then
    raise exception 'partner_id is required' using errcode = '23514';
  end if;

  if p_old_credential_id is null then
    raise exception 'old credential id is required' using errcode = '23514';
  end if;

  if p_new_key_id is null then
    raise exception 'new key id is required' using errcode = '23514';
  end if;

  if p_new_secret_hash is null or btrim(p_new_secret_hash) = '' then
    raise exception 'new secret hash is required' using errcode = '23514';
  end if;

  select status
    into v_partner_status
  from public.partners
  where id = p_partner_id
  for update;

  if not found then
    raise exception 'partner not found' using errcode = '23503';
  end if;

  if v_partner_status <> 'active' then
    raise exception 'partner is not active' using errcode = '23514';
  end if;

  select *
    into v_old_record
  from public.partner_credentials
  where id = p_old_credential_id
    and partner_id = p_partner_id
  for update;

  if not found then
    raise exception 'credential not found for partner' using errcode = '23503';
  end if;

  if v_old_record.revoked_at is not null then
    raise exception 'credential already revoked' using errcode = '23505';
  end if;

  insert into public.partner_credentials (
    partner_id,
    key_id,
    secret_hash,
    created_at,
    last_used_at,
    revoked_at
  )
  values (
    p_partner_id,
    p_new_key_id,
    p_new_secret_hash,
    now(),
    null,
    null
  )
  returning id into v_new_id;

  update public.partner_credentials
  set revoked_at = now()
  where id = p_old_credential_id;

  return jsonb_build_object(
    'ok', true,
    'new_credential_id', v_new_id,
    'old_credential_id', p_old_credential_id,
    'partner_id', p_partner_id
  );
end;
$$;

revoke all on function public.terminate_partner(uuid) from public;
revoke all on function public.terminate_partner(uuid) from anon;
revoke all on function public.terminate_partner(uuid) from authenticated;
grant execute on function public.terminate_partner(uuid) to service_role;

revoke all on function public.rotate_partner_credential(uuid, uuid, uuid, text) from public;
revoke all on function public.rotate_partner_credential(uuid, uuid, uuid, text) from anon;
revoke all on function public.rotate_partner_credential(uuid, uuid, uuid, text) from authenticated;
grant execute on function public.rotate_partner_credential(uuid, uuid, uuid, text) to service_role;

commit;
