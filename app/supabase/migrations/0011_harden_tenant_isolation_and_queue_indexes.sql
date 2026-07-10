-- 0011_harden_tenant_isolation_and_queue_indexes.sql
-- Harden tenant isolation for users.default_company_id and improve notification_queue lookup performance.

begin;

drop policy if exists users_update_self on public.users;

create policy users_update_self on public.users
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (
      default_company_id is null
      or exists (
        select 1
        from public.companies c
        where c.id = default_company_id
          and c.owner_user_id = auth.uid()
          and c.deleted_at is null
      )
    )
  );

create index if not exists notification_queue_company_status_updated_at_idx
  on public.notification_queue (company_id, status, updated_at desc);

commit;
