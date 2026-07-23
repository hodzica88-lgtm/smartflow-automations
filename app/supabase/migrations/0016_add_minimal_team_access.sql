-- 0016_add_minimal_team_access.sql
-- Minimal employee access: pending/active state plus tenant-safe RLS access.

begin;

alter table public.users
  add column if not exists team_status text not null default 'active';

alter table public.users
  drop constraint if exists users_team_status_check;

alter table public.users
  add constraint users_team_status_check
  check (team_status in ('pending', 'active'));

create index if not exists users_default_company_team_status_idx
  on public.users (default_company_id, team_status, role);

create or replace function public.app_user_has_company_access(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    join public.companies c on c.id = target_company_id
    where u.id = auth.uid()
      and u.default_company_id = target_company_id
      and u.team_status = 'active'
      and c.deleted_at is null
      and (
        (u.role = 'owner' and c.owner_user_id = auth.uid())
        or u.role in ('admin', 'member')
      )
  );
$$;

revoke all on function public.app_user_has_company_access(uuid) from public;
grant execute on function public.app_user_has_company_access(uuid) to authenticated;
grant execute on function public.app_user_has_company_access(uuid) to service_role;

commit;
