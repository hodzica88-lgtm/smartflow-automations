-- Generic action rate limits for auth/team/billing/export flows.

begin;

create table if not exists public.action_rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  company_id uuid null,
  actor_hash text not null,
  created_at timestamptz not null default now(),

  constraint action_rate_limits_scope_not_empty check (btrim(scope) <> ''),
  constraint action_rate_limits_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade
);

create index if not exists action_rate_limits_scope_actor_created_idx
  on public.action_rate_limits (scope, actor_hash, created_at desc);

create index if not exists action_rate_limits_company_scope_created_idx
  on public.action_rate_limits (company_id, scope, created_at desc)
  where company_id is not null;

create or replace function public.check_and_record_action_rate_limit(
  p_scope text,
  p_company_id uuid,
  p_actor_value text,
  p_max_submissions integer default 10,
  p_window_minutes integer default 10
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := now();
  v_scope text := nullif(btrim(p_scope), '');
  v_actor_value text := nullif(btrim(p_actor_value), '');
  v_actor_hash text;
  v_max_submissions integer := least(greatest(coalesce(p_max_submissions, 10), 1), 1000);
  v_window_minutes integer := least(greatest(coalesce(p_window_minutes, 10), 1), 1440);
  v_recent_count integer;
  v_oldest_within_window timestamptz;
  v_retry_after integer;
begin
  if v_scope is null or v_actor_value is null then
    return query select false, 60;
    return;
  end if;

  v_actor_hash := encode(extensions.digest(v_scope || ':' || coalesce(p_company_id::text, 'global') || ':' || v_actor_value, 'sha256'), 'hex');

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_scope),
    pg_catalog.hashtext(v_actor_hash)
  );

  delete from public.action_rate_limits
  where scope = v_scope
    and actor_hash = v_actor_hash
    and created_at < (v_now - interval '2 day');

  select count(*)::integer,
         min(created_at)
    into v_recent_count, v_oldest_within_window
  from public.action_rate_limits
  where scope = v_scope
    and actor_hash = v_actor_hash
    and created_at >= (v_now - make_interval(mins => v_window_minutes));

  if v_recent_count >= v_max_submissions then
    if v_oldest_within_window is null then
      v_retry_after := 60;
    else
      v_retry_after := greatest(
        1,
        ceil(extract(epoch from ((v_oldest_within_window + make_interval(mins => v_window_minutes)) - v_now)))::integer
      );
    end if;

    return query select false, v_retry_after;
    return;
  end if;

  insert into public.action_rate_limits (scope, company_id, actor_hash, created_at)
  values (v_scope, p_company_id, v_actor_hash, v_now);

  return query select true, 0;
end;
$$;

alter table public.action_rate_limits enable row level security;

revoke all on table public.action_rate_limits from public;
revoke all on table public.action_rate_limits from anon;
revoke all on table public.action_rate_limits from authenticated;
grant select, insert, update, delete on table public.action_rate_limits to service_role;

revoke all on function public.check_and_record_action_rate_limit(text, uuid, text, integer, integer) from public;
revoke all on function public.check_and_record_action_rate_limit(text, uuid, text, integer, integer) from anon;
revoke all on function public.check_and_record_action_rate_limit(text, uuid, text, integer, integer) from authenticated;
grant execute on function public.check_and_record_action_rate_limit(text, uuid, text, integer, integer) to service_role;

commit;
