-- 0016_add_minimal_team_access.sql
-- Minimal employee lifecycle state. Employee data access remains server-only.

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

commit;
