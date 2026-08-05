create table if not exists public.company_branding (
  company_id uuid primary key references public.companies (id) on delete cascade,
  logo_url text,
  company_name text,
  primary_color text not null default '#1d4ed8',
  phone text,
  website text,
  email text,
  signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_company_branding_updated_at
  before update on public.company_branding
  for each row execute function public.set_updated_at();

alter table public.company_branding enable row level security;

create policy company_branding_select_company_access on public.company_branding
  for select
  using (public.app_user_has_company_access(company_id));

create policy company_branding_insert_company_access on public.company_branding
  for insert
  with check (public.app_user_has_company_access(company_id));

create policy company_branding_update_company_access on public.company_branding
  for update
  using (public.app_user_has_company_access(company_id))
  with check (public.app_user_has_company_access(company_id));

grant select, insert, update, delete on public.company_branding to service_role;

create table if not exists public.company_email_templates (
  company_id uuid not null references public.companies (id) on delete cascade,
  template_type text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, template_type),
  constraint company_email_templates_type_check
    check (
      template_type in (
        'owner_new_lead',
        'customer_confirmation'
      )
    )
);

create trigger set_company_email_templates_updated_at
  before update on public.company_email_templates
  for each row execute function public.set_updated_at();

alter table public.company_email_templates enable row level security;

create policy company_email_templates_select_company_access on public.company_email_templates
  for select
  using (public.app_user_has_company_access(company_id));

create policy company_email_templates_insert_company_access on public.company_email_templates
  for insert
  with check (public.app_user_has_company_access(company_id));

create policy company_email_templates_update_company_access on public.company_email_templates
  for update
  using (public.app_user_has_company_access(company_id))
  with check (public.app_user_has_company_access(company_id));

grant select, insert, update, delete on public.company_email_templates to service_role;
