# SmartFlow Database

## Purpose

This document defines the SmartFlow V1 database schema for Supabase. It is documentation only and does not include SQL.

## Global Standards

- Primary keys use UUID values.
- Every table includes `created_at` and `updated_at`.
- Foreign keys should be indexed.
- Tenant-owned records are scoped through `company_id`.
- User-owned records are scoped through `user_id`.
- Row Level Security should be enabled for every table before production use.
- Timestamps should use `timestamptz`.
- Text identifiers that power application logic should use constrained text values rather than unconstrained free text.

## Tables

## users

Stores application profile data for authenticated Supabase users.

### Columns

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. Matches Supabase Auth user id. |
| `email` | `text` | Yes | User email address. |
| `full_name` | `text` | No | Display name. |
| `role` | `text` | Yes | Application role. Default `owner`. |
| `default_company_id` | `uuid` | No | Current or primary company for the user. |
| `created_at` | `timestamptz` | Yes | Creation timestamp. |
| `updated_at` | `timestamptz` | Yes | Last update timestamp. |

### Keys

- Primary key: `id`
- Foreign key: `default_company_id` references `companies.id`

### Indexes

- Unique index on trimmed, lowercased `email`
- Index on `default_company_id`

### Constraints

- `email` must be unique case-insensitively, ignoring surrounding whitespace, and not empty.
- `role` must be one of `owner`, `admin`, or `member`.

### RLS Notes

- Users can read and update their own profile.
- Company admins can read profiles associated with their company if membership logic is added later.

## companies

Stores tenant accounts and company-level business identity.

### Columns

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. |
| `owner_user_id` | `uuid` | Yes | User who owns the company. |
| `name` | `text` | Yes | Company name. |
| `website_url` | `text` | No | Company website. |
| `phone` | `text` | No | Primary phone number. |
| `industry` | `text` | No | Optional business category. |
| `timezone` | `text` | Yes | Default `America/New_York`. |
| `created_at` | `timestamptz` | Yes | Creation timestamp. |
| `updated_at` | `timestamptz` | Yes | Last update timestamp. |

### Keys

- Primary key: `id`
- Foreign key: `owner_user_id` references `users.id`

### Indexes

- Index on `owner_user_id`
- Index on `name`

### Constraints

- `name` must not be empty.
- `timezone` must not be empty.

### RLS Notes

- Owners can read and update their companies.
- Company-scoped records should only be visible when the authenticated user owns or belongs to the company.

## leads

Stores inbound and manually created sales leads.

### Columns

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. |
| `company_id` | `uuid` | Yes | Tenant owner. |
| `assigned_user_id` | `uuid` | No | User responsible for follow-up. |
| `first_name` | `text` | No | Lead first name. |
| `last_name` | `text` | No | Lead last name. |
| `email` | `text` | No | Lead email address. |
| `phone` | `text` | No | Lead phone number. |
| `company_name` | `text` | No | Lead's company or organization. |
| `source` | `text` | Yes | Origin such as `website`, `manual`, `make`, or `import`. |
| `status` | `text` | Yes | Current lead status. |
| `priority` | `text` | Yes | Default `normal`. |
| `notes` | `text` | No | Internal notes. |
| `last_contacted_at` | `timestamptz` | No | Most recent contact timestamp. |
| `created_at` | `timestamptz` | Yes | Creation timestamp. |
| `updated_at` | `timestamptz` | Yes | Last update timestamp. |

### Keys

- Primary key: `id`
- Foreign key: `company_id` references `companies.id`
- Foreign key: `assigned_user_id` references `users.id`
- Unique key: `id, company_id` to support tenant-safe composite references.

### Indexes

- Index on `company_id`
- Index on `assigned_user_id`
- Composite index on `company_id, status`
- Composite index on `company_id, created_at`
- Composite index on `company_id, updated_at`
- Index on `email`
- Index on `phone`

### Constraints

- `source` must not be empty.
- `status` must be one of `new`, `contacted`, `qualified`, `proposal`, `won`, `lost`, or `archived`.
- `priority` must be one of `low`, `normal`, `high`, or `urgent`.
- At least one contact field should be present: `email`, `phone`, or `company_name`.
- Lead-owned child rows must reference both `id` and `company_id` so records cannot point to leads in another tenant.

### RLS Notes

- Users can access leads belonging to companies they own or are allowed to access.
- Insert policies should require `company_id` to be one of the authenticated user's allowed companies.

## lead_status_history

Stores status changes for leads without duplicating the full lead record.

### Columns

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. |
| `lead_id` | `uuid` | Yes | Lead being changed. |
| `company_id` | `uuid` | Yes | Denormalized tenant scope for faster RLS and queries. |
| `changed_by_user_id` | `uuid` | No | User who made the change. Nullable for system changes. |
| `from_status` | `text` | No | Previous status. |
| `to_status` | `text` | Yes | New status. |
| `reason` | `text` | No | Optional change reason. |
| `created_at` | `timestamptz` | Yes | Creation timestamp. |
| `updated_at` | `timestamptz` | Yes | Last update timestamp. |

### Keys

- Primary key: `id`
- Foreign key: `lead_id, company_id` references `leads.id, leads.company_id`
- Foreign key: `company_id` references `companies.id`
- Foreign key: `changed_by_user_id` references `users.id`

### Indexes

- Index on `lead_id`
- Index on `company_id`
- Composite index on `company_id, created_at`
- Composite index on `lead_id, created_at`
- Index on `changed_by_user_id`

### Constraints

- `to_status` must be one of `new`, `contacted`, `qualified`, `proposal`, `won`, `lost`, or `archived`.
- `from_status`, when present, must use the same allowed status values.
- `from_status` and `to_status` should not be equal.
- `company_id` must match the related lead's `company_id`.

### RLS Notes

- Access follows the related lead's company scope.
- Inserts should only be allowed for users with access to the related lead.

## reminders

Stores follow-up tasks and scheduled actions for leads.

### Columns

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. |
| `company_id` | `uuid` | Yes | Tenant owner. |
| `lead_id` | `uuid` | No | Related lead. |
| `assigned_user_id` | `uuid` | Yes | User responsible for the reminder. |
| `title` | `text` | Yes | Reminder title. |
| `description` | `text` | No | Optional details. |
| `due_at` | `timestamptz` | Yes | Scheduled reminder time. |
| `status` | `text` | Yes | Default `pending`. |
| `completed_at` | `timestamptz` | No | Completion timestamp. |
| `created_at` | `timestamptz` | Yes | Creation timestamp. |
| `updated_at` | `timestamptz` | Yes | Last update timestamp. |

### Keys

- Primary key: `id`
- Foreign key: `company_id` references `companies.id`
- Foreign key: `lead_id, company_id` references `leads.id, leads.company_id`
- Foreign key: `assigned_user_id` references `users.id`

### Indexes

- Index on `company_id`
- Index on `lead_id`
- Index on `assigned_user_id`
- Composite index on `assigned_user_id, status, due_at`
- Composite index on `company_id, status, due_at`

### Constraints

- `title` must not be empty.
- `status` must be one of `pending`, `completed`, `snoozed`, or `cancelled`.
- `completed_at` should be present only when `status` is `completed`.
- `company_id` must match the related lead's `company_id` when `lead_id` is present.

### RLS Notes

- Users can access reminders assigned to them or belonging to companies they can access.
- Company admins can access company reminders if admin roles are enabled.

## settings

Stores company-level configuration for SmartFlow behavior and provider integration flags.

### Columns

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. |
| `company_id` | `uuid` | Yes | Tenant owner. |
| `lead_auto_assign_enabled` | `boolean` | Yes | Default `false`. |
| `default_lead_source` | `text` | Yes | Default `website`. |
| `reminder_default_hours` | `integer` | Yes | Default follow-up delay. |
| `brevo_enabled` | `boolean` | Yes | Default `false`. |
| `make_enabled` | `boolean` | Yes | Default `false`. |
| `stripe_enabled` | `boolean` | Yes | Default `false`. |
| `created_at` | `timestamptz` | Yes | Creation timestamp. |
| `updated_at` | `timestamptz` | Yes | Last update timestamp. |

### Keys

- Primary key: `id`
- Foreign key: `company_id` references `companies.id`

### Indexes

- Unique index on `company_id`

### Constraints

- Each company has exactly one settings row.
- `default_lead_source` must not be empty.
- `reminder_default_hours` must be greater than or equal to `0`.

### RLS Notes

- Settings access follows company access.
- Updates should be limited to company owners or admins.

## subscriptions

Stores billing subscription state for each company.

### Columns

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. |
| `company_id` | `uuid` | Yes | Tenant owner. |
| `stripe_customer_id` | `text` | No | Stripe customer identifier. |
| `stripe_subscription_id` | `text` | No | Stripe subscription identifier. |
| `plan` | `text` | Yes | Current plan. Default `free`. |
| `status` | `text` | Yes | Billing status. Default `inactive`. |
| `current_period_start` | `timestamptz` | No | Stripe period start. |
| `current_period_end` | `timestamptz` | No | Stripe period end. |
| `cancel_at_period_end` | `boolean` | Yes | Default `false`. |
| `created_at` | `timestamptz` | Yes | Creation timestamp. |
| `updated_at` | `timestamptz` | Yes | Last update timestamp. |

### Keys

- Primary key: `id`
- Foreign key: `company_id` references `companies.id`

### Indexes

- Unique index on `company_id`
- Unique index on `stripe_customer_id`, ignoring null values.
- Unique index on `stripe_subscription_id`, ignoring null values.
- Composite index on `status, current_period_end`

### Constraints

- `plan` must be one of `free`, `starter`, `growth`, or `pro`.
- `status` must be one of `inactive`, `trialing`, `active`, `past_due`, `cancelled`, or `unpaid`.
- `current_period_end` should be after `current_period_start` when both are present.

### RLS Notes

- Subscription access follows company access.
- Client-side access should be read-only.
- Stripe webhook updates should use a trusted server context.

## Performance Notes

- Keep tenant filters on `company_id` for all company-owned queries.
- Use composite indexes for common dashboard views, especially lead status lists and due reminders.
- Keep status history append-only from the application layer.
- Avoid JSON columns in V1 unless a provider payload must be retained later.
- Add full-text search only when the product requires it.

## Delete Behavior

- Deleting a Supabase Auth user cascades to the matching `users` row, but company ownership is protected by `companies.owner_user_id` using restrict behavior. A user who owns a company must transfer or remove the company before account deletion can complete.
- Deleting a company cascades to its `leads`, `lead_status_history`, `reminders`, `settings`, and `subscriptions`.
- Deleting a lead cascades to its `lead_status_history` and lead-linked `reminders`.
- Removing a lead assignee sets `leads.assigned_user_id` to null.
- Removing a status-change actor sets `lead_status_history.changed_by_user_id` to null.
- Removing a reminder assignee is restricted while reminders are still assigned.
- Removing a user's default company sets `users.default_company_id` to null.

## RLS Preparation

Policies should be based on authenticated user ownership and company access:

- `users.id` should align with `auth.uid()`.
- `companies.owner_user_id` should determine initial tenant ownership.
- Company-scoped tables should check access through `company_id`.
- Service-role operations should be reserved for server-side automation, billing webhooks, and trusted background work.

## Future Migration Watchlist

- Add company membership records if V1 expands beyond owner-scoped company access.
- Add provider payload storage only if Stripe, Brevo, or Make.com workflows require retained raw events.
- Add full-text search indexes only after real lead search requirements are known.
