begin;

alter table public.support_threads
  add column if not exists triage_bucket text,
  add column if not exists triage_category text,
  add column if not exists triage_summary text,
  add column if not exists triage_action text,
  add column if not exists triage_confidence double precision,
  add column if not exists triage_reason text;

-- Safe repeatable constraint creation for existing production tables.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_threads_triage_bucket_check'
      and conrelid = 'public.support_threads'::regclass
  ) then
    alter table public.support_threads
      add constraint support_threads_triage_bucket_check
      check (
        triage_bucket is null
        or triage_bucket in ('important', 'review', 'sales', 'spam')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_threads_triage_category_check'
      and conrelid = 'public.support_threads'::regclass
  ) then
    alter table public.support_threads
      add constraint support_threads_triage_category_check
      check (
        triage_category is null
        or triage_category in (
          'customer_support',
          'potential_customer',
          'billing',
          'security',
          'legal_privacy',
          'partnership',
          'vendor_sales',
          'spam',
          'unclear'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_threads_triage_action_check'
      and conrelid = 'public.support_threads'::regclass
  ) then
    alter table public.support_threads
      add constraint support_threads_triage_action_check
      check (
        triage_action is null
        or triage_action in ('respond', 'review', 'ignore')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_threads_triage_confidence_check'
      and conrelid = 'public.support_threads'::regclass
  ) then
    alter table public.support_threads
      add constraint support_threads_triage_confidence_check
      check (
        triage_confidence is null
        or (triage_confidence >= 0.0 and triage_confidence <= 1.0)
      );
  end if;
end $$;

create index if not exists support_threads_triage_bucket_last_message_idx
  on public.support_threads (triage_bucket, last_message_at desc nulls last);

commit;
