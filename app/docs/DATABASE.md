# AnfragePilot Database (Current Schema)

This document reflects the effective database schema after migrations 0001 through 0007.

## Migration Order

Apply migrations strictly in numerical order:

1. 0001_initial_schema.sql
2. 0002_complete_schema.sql
3. 0003_align_lead_workflow_with_specs.sql
4. 0004_notification_queue.sql
5. 0005_add_customer_confirmation_notification_type.sql
6. 0006_align_lead_status_history_statuses.sql
7. 0007_add_companies_notification_email.sql

## companies

Purpose: Tenant/company profile and ownership.

Main fields:
- id (uuid, PK)
- owner_user_id (uuid, FK -> users.id)
- name (text, required)
- contact_person (text, required)
- email (text, required)
- notification_email (text, optional, dedicated recipient for company notifications)
- website_url (text, optional)
- phone (text, optional)
- industry (text, optional)
- timezone (text, required, default America/New_York)
- business_hours (text, optional)
- deleted_at (timestamptz, optional)
- created_at (timestamptz)
- updated_at (timestamptz)

## leads

Purpose: Lead intake and lead lifecycle tracking.

Main fields:
- id (uuid, PK)
- company_id (uuid, FK -> companies.id)
- assigned_user_id (uuid, FK -> users.id, nullable)
- first_name (text)
- last_name (text)
- email (text)
- phone (text)
- company_name (text)
- address (text)
- inquiry_type (text)
- source (text, required)
- status (text, required)
- successful_outcome (text, nullable)
- unsuccessful_outcome (text, nullable)
- priority (text, default normal)
- notes (text)
- last_contacted_at (timestamptz)
- deleted_at (timestamptz, optional)
- created_at (timestamptz)
- updated_at (timestamptz)

Current lead statuses:
- new
- contacted
- successful
- unsuccessful

Successful outcomes:
- appointment_scheduled
- offer_created
- job_won

Unsuccessful outcomes:
- price_comparison
- no_interest
- unreachable
- outside_service_area
- too_expensive
- other

Outcome rules:
- successful_outcome is only valid when status = successful.
- unsuccessful_outcome is only valid when status = unsuccessful.
- successful_outcome and unsuccessful_outcome are mutually exclusive.

## lead_status_history

Purpose: Audit trail of lead status changes.

Main fields:
- id (uuid, PK)
- lead_id (uuid, FK -> leads.id with company scope)
- company_id (uuid, tenant scope)
- changed_by_user_id (uuid, FK -> users.id, nullable)
- from_status (text, nullable)
- to_status (text, required)
- reason (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Status vocabulary in history (from_status/to_status):
- new
- contacted
- successful
- unsuccessful

## notification_queue

Purpose: Queue for internal notification delivery jobs.

Main fields:
- id (uuid, PK)
- company_id (uuid, FK -> companies.id)
- lead_id (uuid, FK -> leads.id with company scope)
- notification_type (text, required)
- status (text, required, default pending)
- scheduled_for (timestamptz, required, default now())
- sent_at (timestamptz, nullable)
- error_message (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Notification types:
- customer_confirmation
- owner_new_lead

Queue statuses:
- pending
- sent
- failed
- cancelled

scheduled_for behavior:
- Row is due when scheduled_for <= current time.
- Future scheduled_for values delay processing until due.
- Default now() makes new rows immediately eligible.

Additional queue constraint:
- Unique index on (company_id, lead_id, notification_type).
