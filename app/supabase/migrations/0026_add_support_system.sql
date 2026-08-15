-- Minimal AI-assisted support system for Varnito.

begin;

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null,
  customer_name text null,
  company_id uuid null,
  locale text not null default 'de' check (locale in ('de', 'us', 'unknown')),
  subject text not null default 'Support request',
  status text not null default 'open' check (status in ('open', 'ai_answered', 'escalated', 'waiting_customer', 'resolved')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  category text not null default 'unknown' check (category in ('general_usage', 'payment', 'refund', 'legal', 'privacy', 'account_deletion', 'security', 'unknown')),
  ai_confidence double precision null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz null,

  constraint support_threads_customer_email_not_empty check (btrim(customer_email) <> ''),
  constraint support_threads_subject_not_empty check (btrim(subject) <> ''),
  constraint support_threads_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete set null
);

create index if not exists support_threads_status_last_message_idx
  on public.support_threads (status, last_message_at desc nulls last);

create index if not exists support_threads_customer_email_created_idx
  on public.support_threads (customer_email, created_at desc);

create index if not exists support_threads_locale_status_idx
  on public.support_threads (locale, status, created_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_type text not null check (sender_type in ('customer', 'ai', 'owner', 'system')),
  sender_email text null,
  body_text text not null,
  body_html text null,
  provider_message_id text null,
  created_at timestamptz not null default now(),

  constraint support_messages_thread_id_fkey
    foreign key (thread_id)
    references public.support_threads (id)
    on delete cascade,
  constraint support_messages_body_text_not_empty check (btrim(body_text) <> ''),
  constraint support_messages_provider_message_id_unique unique (provider_message_id)
    deferrable initially deferred
);

create index if not exists support_messages_thread_created_idx
  on public.support_messages (thread_id, created_at asc);

create index if not exists support_messages_provider_message_id_idx
  on public.support_messages (provider_message_id)
  where provider_message_id is not null;

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

revoke all on table public.support_threads from public;
revoke all on table public.support_threads from anon;
revoke all on table public.support_threads from authenticated;
grant select, insert, update, delete on table public.support_threads to service_role;

revoke all on table public.support_messages from public;
revoke all on table public.support_messages from anon;
revoke all on table public.support_messages from authenticated;
grant select, insert, update, delete on table public.support_messages to service_role;

commit;
