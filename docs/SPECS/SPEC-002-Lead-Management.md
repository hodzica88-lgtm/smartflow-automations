# SPEC-002: Lead Management

## Purpose

Define how SmartFlow tracks and manages lead progression after intake.

## Target user

- Local service business owners and team members managing inbound leads.
- German-first service providers who need clear lead status and follow-up visibility.

## Business rules

- Leads belong to a tenant company and are scoped by `company_id`.
- Lead owners decide on the next action for each lead.
- Lead statuses should remain clear and predictable.
- Reminders and activities support follow-up without forcing appointments.

## Required fields

- lead status
- assigned user (optional, if relevant)
- contact details from intake

## Optional fields

- notes
- last contacted timestamp
- company name

## User flow

1. Business reviews incoming leads on the dashboard.
2. Business updates lead status or assigns a user.
3. Business creates follow-up reminders or activities.
4. Lead history and status changes are recorded for reference.

## Database impact

- Update `leads` records with status, priority, and assignment fields.
- Store reminder or activity records that reference `lead_id` and `company_id`.
- Persist status history if implemented using a dedicated audit table.

## Automation impact

- Trigger automations when lead status changes.
- Use reminders to notify users of required follow-up.
- Keep automation payloads tenant-scoped and validation-driven.

## UI requirements

- Display lead status clearly.
- Provide simple controls for updating status and follow-up actions.
- Keep the management interface uncluttered and easy to scan.
- Use German-first language and familiar service-business terms.

## Out of scope

- Automatic appointment creation.
- Fully-featured deal stage workflows beyond explicit statuses.
- Complex sales pipeline reporting.

## Acceptance criteria

- Leads can be updated with status and follow-up information.
- Follow-up actions can be added without creating appointments.
- Lead updates remain tenant-scoped and visible only to the company.
