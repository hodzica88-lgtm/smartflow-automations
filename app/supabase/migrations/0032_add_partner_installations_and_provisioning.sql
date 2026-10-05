begin;

create table if not exists public.partner_provider_bindings (
  provider text primary key,
  partner_id uuid not null unique references public.partners (id),
  created_at timestamptz not null default now(),
  last_verified_at timestamptz null,

  constraint partner_provider_bindings_provider_not_empty
    check (btrim(provider) <> ''),
  constraint partner_provider_bindings_provider_format
    check (provider ~ '^[a-z0-9][a-z0-9_-]*$')
);

create table if not exists public.partner_installations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_install_id text not null,
  created_at timestamptz not null default now(),
  last_verified_at timestamptz null,

  constraint partner_installations_provider_fkey
    foreign key (provider)
    references public.partner_provider_bindings (provider)
    on delete restrict,
  constraint partner_installations_provider_install_id_not_empty
    check (btrim(provider_install_id) <> ''),
  constraint partner_installations_provider_install_id_format
    check (provider_install_id ~ '^[A-Za-z0-9._:-]+$'),
  constraint partner_installations_provider_install_id_unique
    unique (provider, provider_install_id)
);

create table if not exists public.partner_provisioning_requests (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  request_id text not null,
  request_fingerprint text not null,
  nonce_hash text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  credential_id uuid null references public.partner_credentials (id),
  status text not null default 'accepted'
    check (status in ('accepted', 'replayed', 'expired', 'confirmed', 'recovered', 'failed')),
  credential_confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partner_provisioning_requests_provider_fkey
    foreign key (provider)
    references public.partner_provider_bindings (provider)
    on delete restrict,
  constraint partner_provisioning_requests_request_id_not_empty
    check (btrim(request_id) <> ''),
  constraint partner_provisioning_requests_request_fingerprint_not_empty
    check (btrim(request_fingerprint) <> ''),
  constraint partner_provisioning_requests_nonce_hash_not_empty
    check (btrim(nonce_hash) <> ''),
  constraint partner_provisioning_requests_unique_provider_request
    unique (provider, request_id),
  constraint partner_provisioning_requests_unique_provider_fingerprint
    unique (provider, request_fingerprint),
  constraint partner_provisioning_requests_unique_provider_nonce
    unique (provider, nonce_hash),
  constraint partner_provisioning_requests_valid_window
    check (expires_at > issued_at)
);

create index if not exists partner_installations_provider_last_verified_idx
  on public.partner_installations (provider, last_verified_at desc);

create index if not exists partner_provisioning_requests_provider_status_idx
  on public.partner_provisioning_requests (provider, status, created_at desc);

create or replace function public.provision_provider_installation(
  p_provider text,
  p_provider_install_id text,
  p_request_id text,
  p_nonce_hash text,
  p_request_fingerprint text,
  p_issued_at timestamptz,
  p_expires_at timestamptz,
  p_partner_name text,
  p_partner_key text,
  p_credential_key_id uuid,
  p_credential_secret_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := nullif(btrim(p_provider), '');
  v_provider_install_id text := nullif(btrim(p_provider_install_id), '');
  v_request_id text := nullif(btrim(p_request_id), '');
  v_nonce_hash text := nullif(btrim(p_nonce_hash), '');
  v_request_fingerprint text := nullif(btrim(p_request_fingerprint), '');
  v_partner_name text := nullif(btrim(p_partner_name), '');
  v_partner_key text := nullif(btrim(p_partner_key), '');
  v_credential_secret_hash text := nullif(btrim(p_credential_secret_hash), '');
  v_now timestamptz := now();
  v_binding public.partner_provider_bindings%rowtype;
  v_existing_request public.partner_provisioning_requests%rowtype;
  v_partner_id uuid;
  v_credential_id uuid;
  v_installation_created boolean := false;
begin
  if v_provider is null then
    raise exception 'provider is required' using errcode = '23514';
  end if;

  if v_provider_install_id is null then
    raise exception 'provider_install_id is required' using errcode = '23514';
  end if;

  if v_request_id is null then
    raise exception 'request_id is required' using errcode = '23514';
  end if;

  if v_nonce_hash is null then
    raise exception 'nonce_hash is required' using errcode = '23514';
  end if;

  if v_request_fingerprint is null then
    raise exception 'request_fingerprint is required' using errcode = '23514';
  end if;

  if p_issued_at is null then
    raise exception 'issued_at is required' using errcode = '23514';
  end if;

  if p_expires_at is null or p_expires_at <= p_issued_at then
    raise exception 'invalid provisioning window' using errcode = '23514';
  end if;

  if v_partner_name is null then
    raise exception 'partner_name is required' using errcode = '23514';
  end if;

  if v_partner_key is null then
    raise exception 'partner_key is required' using errcode = '23514';
  end if;

  if p_credential_key_id is null then
    raise exception 'credential_key_id is required' using errcode = '23514';
  end if;

  if v_credential_secret_hash is null then
    raise exception 'credential_secret_hash is required' using errcode = '23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_provider),
    pg_catalog.hashtext(v_request_id)
  );

  select *
    into v_binding
  from public.partner_provider_bindings
  where provider = v_provider
  for update;

  select *
    into v_existing_request
  from public.partner_provisioning_requests
  where provider = v_provider
    and request_id = v_request_id
  for update;

  if found then
    if v_existing_request.request_fingerprint = v_request_fingerprint then
      return jsonb_build_object(
        'idempotent', true,
        'credential_inserted', false,
        'partner_id', coalesce(v_binding.partner_id, (select partner_id from public.partner_credentials where id = v_existing_request.credential_id limit 1)),
        'partner_key', coalesce(v_binding.provider, v_provider),
        'provider', v_provider,
        'provisioning_request_id', v_request_id,
        'credential_id', v_existing_request.credential_id,
        'partner_status', (
          select status
          from public.partners
          where id = coalesce(v_binding.partner_id, (select partner_id from public.partner_credentials where id = v_existing_request.credential_id limit 1))
          limit 1
        ),
        'installation_created', false
      );
    end if;

    raise exception 'provisioning request replay detected' using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.partner_provisioning_requests
    where provider = v_provider
      and nonce_hash = v_nonce_hash
  ) then
    raise exception 'nonce replay detected' using errcode = '23505';
  end if;

  if v_binding is null then
    insert into public.partners (
      partner_key,
      name,
      status,
      billing_model,
      price_per_customer_minor,
      currency,
      created_at,
      updated_at
    )
    values (
      v_partner_key,
      v_partner_name,
      'pending',
      'per_customer',
      null,
      'EUR',
      v_now,
      v_now
    )
    returning id into v_partner_id;

    insert into public.partner_provider_bindings (
      provider,
      partner_id,
      last_verified_at,
      created_at
    )
    values (
      v_provider,
      v_partner_id,
      v_now,
      v_now
    );

    v_installation_created := true;
  else
    v_partner_id := v_binding.partner_id;
  end if;

  if not exists (
    select 1
    from public.partner_installations
    where provider = v_provider
      and provider_install_id = v_provider_install_id
  ) then
    v_installation_created := true;
  end if;

  insert into public.partner_installations (
    provider,
    provider_install_id,
    last_verified_at,
    created_at
  )
  values (
    v_provider,
    v_provider_install_id,
    v_now,
    v_now
  )
  on conflict (provider, provider_install_id)
  do update set last_verified_at = excluded.last_verified_at;

  if v_binding is null then
    insert into public.partner_credentials (
      partner_id,
      key_id,
      secret_hash,
      created_at,
      last_used_at,
      revoked_at
    )
    values (
      v_partner_id,
      p_credential_key_id,
      v_credential_secret_hash,
      v_now,
      null,
      null
    )
    returning id into v_credential_id;

    update public.partners
    set status = 'active', updated_at = v_now
    where id = v_partner_id;
  else
    v_credential_id := null;
  end if;

  insert into public.partner_provisioning_requests (
    provider,
    request_id,
    request_fingerprint,
    nonce_hash,
    issued_at,
    expires_at,
    credential_id,
    status,
    credential_confirmed_at,
    created_at,
    updated_at
  )
  values (
    v_provider,
    v_request_id,
    v_request_fingerprint,
    v_nonce_hash,
    p_issued_at,
    p_expires_at,
    v_credential_id,
    'accepted',
    null,
    v_now,
    v_now
  );

  if v_binding is null then
    return jsonb_build_object(
      'idempotent', false,
      'credential_inserted', true,
      'partner_id', v_partner_id,
      'partner_key', v_partner_key,
      'provider', v_provider,
      'provisioning_request_id', v_request_id,
      'credential_id', v_credential_id,
      'partner_status', 'active',
      'installation_created', v_installation_created
    );
  end if;

  return jsonb_build_object(
    'idempotent', false,
    'credential_inserted', false,
    'partner_id', v_partner_id,
    'partner_key', v_partner_key,
    'provider', v_provider,
    'provisioning_request_id', v_request_id,
    'credential_id', null,
    'partner_status', (select status from public.partners where id = v_partner_id limit 1),
    'installation_created', v_installation_created
  );
end;
$$;

revoke all on function public.provision_provider_installation(text, text, text, text, text, timestamptz, timestamptz, text, text, uuid, text) from public;
revoke all on function public.provision_provider_installation(text, text, text, text, text, timestamptz, timestamptz, text, text, uuid, text) from anon;
revoke all on function public.provision_provider_installation(text, text, text, text, text, timestamptz, timestamptz, text, text, uuid, text) from authenticated;
grant execute on function public.provision_provider_installation(text, text, text, text, text, timestamptz, timestamptz, text, text, uuid, text) to service_role;

create or replace function public.recover_partner_provisioning_credential(
  p_provider text,
  p_request_id text,
  p_provider_install_id text,
  p_new_credential_key_id uuid,
  p_new_credential_secret_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := nullif(btrim(p_provider), '');
  v_request_id text := nullif(btrim(p_request_id), '');
  v_provider_install_id text := nullif(btrim(p_provider_install_id), '');
  v_new_credential_key_id uuid := p_new_credential_key_id;
  v_new_credential_secret_hash text := nullif(btrim(p_new_credential_secret_hash), '');
  v_binding public.partner_provider_bindings%rowtype;
  v_request_record public.partner_provisioning_requests%rowtype;
  v_old_credential public.partner_credentials%rowtype;
  v_new_credential_id uuid;
begin
  if v_provider is null then
    raise exception 'provider is required' using errcode = '23514';
  end if;

  if v_request_id is null then
    raise exception 'request_id is required' using errcode = '23514';
  end if;

  if v_provider_install_id is null then
    raise exception 'provider_install_id is required' using errcode = '23514';
  end if;

  if v_new_credential_key_id is null then
    raise exception 'new credential key id is required' using errcode = '23514';
  end if;

  if v_new_credential_secret_hash is null then
    raise exception 'new credential secret hash is required' using errcode = '23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_provider),
    pg_catalog.hashtext(v_request_id)
  );

  select *
    into v_binding
  from public.partner_provider_bindings
  where provider = v_provider
  for update;

  if not found then
    raise exception 'provider binding not found' using errcode = '23503';
  end if;

  select *
    into v_request_record
  from public.partner_provisioning_requests
  where provider = v_provider
    and request_id = v_request_id
  for update;

  if not found then
    raise exception 'invalid_provisioning_request' using errcode = '23503';
  end if;

  if v_request_record.credential_confirmed_at is not null then
    raise exception 'confirmed request cannot be recovered' using errcode = '23505';
  end if;

  if v_request_record.status not in ('accepted', 'failed') then
    raise exception 'invalid recovery state' using errcode = '23505';
  end if;

  if v_request_record.credential_id is null then
    raise exception 'invalid_provisioning_request' using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.partner_installations
    where provider = v_provider
      and provider_install_id = v_provider_install_id
  ) then
    raise exception 'invalid_provider_installation' using errcode = '23503';
  end if;

  select *
    into v_old_credential
  from public.partner_credentials
  where id = v_request_record.credential_id
  for update;

  if not found then
    raise exception 'invalid_old_credential' using errcode = '23503';
  end if;

  if v_old_credential.partner_id <> v_binding.partner_id then
    raise exception 'provider_binding_mismatch' using errcode = '23505';
  end if;

  if v_old_credential.revoked_at is not null or v_old_credential.last_used_at is not null then
    raise exception 'credential_already_used_or_revoked' using errcode = '23505';
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
    v_binding.partner_id,
    v_new_credential_key_id,
    v_new_credential_secret_hash,
    now(),
    null,
    null
  )
  returning id into v_new_credential_id;

  update public.partner_credentials
  set revoked_at = now()
  where id = v_old_credential.id;

  update public.partner_provisioning_requests
  set credential_id = v_new_credential_id,
      status = 'recovered',
      updated_at = now()
  where id = v_request_record.id;

  return jsonb_build_object(
    'recovered', true,
    'new_credential_id', v_new_credential_id,
    'partner_id', v_binding.partner_id,
    'provider', v_provider,
    'request_id', v_request_id,
    'partner_status', (select status from public.partners where id = v_binding.partner_id limit 1)
  );
end;
$$;

revoke all on function public.recover_partner_provisioning_credential(text, text, text, uuid, text) from public;
revoke all on function public.recover_partner_provisioning_credential(text, text, text, uuid, text) from anon;
revoke all on function public.recover_partner_provisioning_credential(text, text, text, uuid, text) from authenticated;
grant execute on function public.recover_partner_provisioning_credential(text, text, text, uuid, text) to service_role;

create or replace function public.set_partner_provisioning_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger partner_provisioning_requests_updated_at
before update on public.partner_provisioning_requests
for each row
execute function public.set_partner_provisioning_requests_updated_at();

alter table public.partner_provider_bindings enable row level security;
alter table public.partner_installations enable row level security;
alter table public.partner_provisioning_requests enable row level security;

revoke all on table public.partner_provider_bindings from public;
revoke all on table public.partner_provider_bindings from anon;
revoke all on table public.partner_provider_bindings from authenticated;
grant select, insert, update on table public.partner_provider_bindings to service_role;

revoke all on table public.partner_installations from public;
revoke all on table public.partner_installations from anon;
revoke all on table public.partner_installations from authenticated;
grant select, insert, update on table public.partner_installations to service_role;

revoke all on table public.partner_provisioning_requests from public;
revoke all on table public.partner_provisioning_requests from anon;
revoke all on table public.partner_provisioning_requests from authenticated;
grant select, insert, update on table public.partner_provisioning_requests to service_role;

commit;
