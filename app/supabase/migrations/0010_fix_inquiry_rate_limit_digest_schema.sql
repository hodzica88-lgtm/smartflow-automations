-- 0010_fix_inquiry_rate_limit_digest_schema.sql
-- Fix digest schema reference in inquiry rate-limit function.

begin;

create or replace function public.check_and_record_inquiry_rate_limit(
  p_company_id uuid,
  p_client_ip text,
  p_max_submissions integer default 5,
  p_window_minutes integer default 10
)
returns table (
  allowed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := now();
  v_max_submissions integer := least(greatest(coalesce(p_max_submissions, 5), 1), 100);
  v_window_minutes integer := least(greatest(coalesce(p_window_minutes, 10), 1), 1440);
  v_client_ip text := nullif(btrim(p_client_ip), '');
  v_ip_hash text;
  v_recent_count integer;
begin
  if p_company_id is null or v_client_ip is null then
    return query select false;
    return;
  end if;

  v_ip_hash := encode(extensions.digest(v_client_ip, 'sha256'), 'hex');

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_company_id::text),
    pg_catalog.hashtext(v_ip_hash)
  );

  delete from public.inquiry_rate_limits
  where company_id = p_company_id
    and ip_hash = v_ip_hash
    and created_at < (v_now - interval '1 day');

  select count(*)::integer
  into v_recent_count
  from public.inquiry_rate_limits
  where company_id = p_company_id
    and ip_hash = v_ip_hash
    and created_at >= (v_now - make_interval(mins => v_window_minutes));

  if v_recent_count >= v_max_submissions then
    return query select false;
    return;
  end if;

  insert into public.inquiry_rate_limits (company_id, ip_hash, created_at)
  values (p_company_id, v_ip_hash, v_now);

  return query select true;
end;
$$;

revoke all on function public.check_and_record_inquiry_rate_limit(uuid, text, integer, integer) from public;
revoke all on function public.check_and_record_inquiry_rate_limit(uuid, text, integer, integer) from anon;
revoke all on function public.check_and_record_inquiry_rate_limit(uuid, text, integer, integer) from authenticated;
grant execute on function public.check_and_record_inquiry_rate_limit(uuid, text, integer, integer) to service_role;

commit;
