# SmartFlow Database

## Overview

This document describes the production-ready Supabase schema for SmartFlow. The implementation is built for tenant-safe access, strong relational integrity, soft delete support, and row-level security.

## Design Principles

- Use UUID primary keys across all application tables.
- Include `created_at` and `updated_at` timestamps on every table.
- Scope tenant data through `company_id`.
- Keep user identity aligned to Supabase Auth UUIDs.
- Use constrained lookup values for status, priority, and integration flags.
- Enable Row Level Security (RLS) on every application table.
- Support soft deletes through `deleted_at` where records may persist for audit.

## Core Tables

### `users`

Stores SmartFlow profile metadata for authenticated Supabase users.

Columns
- `id` `uuid` — primary key, matches Supabase Auth user ID.
- `email` `text` — user email.
- `full_name` `text` — display name.
- `role` `text` — application role, default `owner`.
- `default_company_id` `uuid` — current or primary company.
- `created_at` `timestamptz`
- `updated_at` `timestamptz`

Keys and Constraints
- PK: `id`
- FK: `default_company_id` → `companies.id`
- Unique case-insensitive normalized `email`
- `role` restricted to `owner`, `admin`, `member`
- `email` must be non-empty

Security
- RLS policies allow users to select, insert, update, and delete only their own row.

### `companies`

Represents tenant accounts and company-level business identity.

Columns
- `id` `uuid` — primary key.
- `owner_user_id` `uuid` — tenant owner.
- `name` `text`
- `contact_person` `text`
- `email` `text`
- `website_url` `text`
- `phone` `text`
- `industry` `text`
- `timezone` `text` — default `America/New_York`
- `business_hours` `text`
- `created_at` `timestamptz`
- `updated_at` `timestamptz`
- `deleted_at` `timestamptz`

Keys and Constraints
- PK: `id`
- FK: `owner_user_id` → `users.id`
- Indexes on `owner_user_id`, `name`, `email`
- Required fields: `name`, `contact_person`, `email`, `timezone`
- Soft delete via `deleted_at`

Security
- RLS policies allow only the owning user to query and mutate the company row.

### `leads`

Captures inbound opportunities and lead metadata.

Columns
- `id` `uuid`
- `company_id` `uuid`
- `assigned_user_id` `uuid`
- `first_name` `text`
- `last_name` `text`
- `email` `text`
- `phone` `text`
- `company_name` `text`
- `source` `text` — required origin value.
- `status` `text` — default `new`.
- `priority` `text` — default `normal`.
- `notes` `text`
- `last_contacted_at` `timestamptz`
- `created_at` `timestamptz`
- `updated_at` `timestamptz`
- `deleted_at` `timestamptz`

Keys and Indexes
- PK: `id`
- FK: `company_id` → `companies.id`
- FK: `assigned_user_id` → `users.id`
- Indexes on `company_id`, `assigned_user_id`, `email`, `phone`
- Composite indexes on `company_id, status`, `company_id, created_at`, `company_id, updated_at`
- Unique constraint on `(id, company_id)` for tenant-safe referencing

Constraints
- `source` must not be empty.
- `status` limited to `new`, `contacted`, `qualified`, `proposal`, `won`, `lost`, `archived`.
- `priority` limited to `low`, `normal`, `high`, `urgent`.
- At least one contact field must exist: `email`, `phone`, or `company_name`.

Security
- RLS policies allow access only to records inside a company owned by the authenticated user.
- Soft delete is used to preserve historical leads while excluding them from active queries.

### `activities`

Tracks work items, notes, and operational follow-up actions.

Columns
- `id` `uuid`
- `company_id` `uuid`
- `lead_id` `uuid`
- `assigned_user_id` `uuid`
- `activity_type` `text` — required.
- `title` `text` — required.
- `details` `text`
- `status` `text` — default `pending`.
- `due_at` `timestamptz`
- `completed_at` `timestamptz`
- `created_at` `timestamptz`
- `updated_at` `timestamptz`
- `deleted_at` `timestamptz`

Keys and Indexes
- PK: `id`
- FK: `company_id` → `companies.id`
- FK: `(lead_id, company_id)` → `leads.id, leads.company_id`
- FK: `assigned_user_id` → `users.id`
- Indexes on `company_id`, `lead_id`, `assigned_user_id`
- Composite index on `company_id, status, due_at`

Constraints
- `activity_type` and `title` cannot be empty.
- `status` limited to `pending`, `completed`, `cancelled`.
- `completed_at` must only be set when the activity status is `completed`.

Security
- RLS ensures only users owning the company can access activity rows.
- Soft delete support preserves activity history.

### `settings`

Stores per-company configuration values and integration flags.

Columns
- `id` `uuid`
- `company_id` `uuid`
- `lead_auto_assign_enabled` `boolean` — default `false`.
- `default_lead_source` `text` — default `website`.
- `reminder_default_hours` `integer` — default `24`.
- `brevo_enabled` `boolean` — default `false`.
- `make_enabled` `boolean` — default `false`.
- `stripe_enabled` `boolean` — default `false`.
- `created_at` `timestamptz`
- `updated_at` `timestamptz`

Keys and Constraints
- PK: `id`
- FK: `company_id` → `companies.id`
- Unique index on `company_id`
- `default_lead_source` must not be empty.
- `reminder_default_hours` must be non-negative.

Security
- RLS limits settings access to the owning company.

## Additional Tables

### `reminders`

Stores scheduled follow-up reminders for leads.

- Tenant-scoped by `company_id`.
- `lead_id` optionally links to a lead within the same company.
- Status values include `pending`, `completed`, `snoozed`, `cancelled`.
- `completed_at` is only set for completed reminders.

### `lead_status_history`

Captures lead status changes for audit and trend analysis.

- References both `lead_id` and `company_id` to enforce tenant integrity.
- Uses the same allowed lead status values as `leads`.
- RLS restricts access to the owning company.

### `subscriptions`

Manages plan and billing state for each company.

- One row per `company_id`.
- Supports `free`, `starter`, `growth`, `pro` plans.
- Tracks Stripe identifiers and billing periods.
- RLS restricts access to the owning company.

## Table Relationships

- `companies.owner_user_id` links tenant ownership to `users.id`.
- `users.default_company_id` points to the user's preferred company.
- `leads.company_id` links inbound opportunities to a tenant.
- `activities.company_id` and `activities.lead_id` keep work items scoped to the tenant and related lead.
- `settings.company_id` is unique and defines per-tenant behavior.
- `reminders.company_id` and `reminders.lead_id` keep scheduled follow-up within tenant scope.
- `lead_status_history.company_id` duplicates tenant scope for efficient RLS.
- `subscriptions.company_id` is unique for company billing state.

## Security and RLS

- Every application table has Row Level Security enabled.
- `users` are limited to managing only their own profile row.
- Tenant-scoped tables require company ownership based on `companies.owner_user_id = auth.uid()`.
- Soft-deleted rows are excluded from active RLS access using `deleted_at` checks where applicable.
- Service role queries may bypass RLS for trusted backend operations, while client-side access is protected.

## Scalability

- Tenant isolation through `company_id` supports multi-tenant growth.
- UUID keys provide globally unique identifiers for distributed workloads.
- Denormalized tenant references in child tables simplify access checks and RLS.
- Indexed filters on status, company, assignments, and dates support dashboard and reporting queries.
- Soft delete preserves audit history without hard removing records.
- A trigger-based `updated_at` mechanism keeps time-based synchronization reliable.
