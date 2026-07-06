# SPEC-003: Company Settings

## Purpose

Define how company-level configuration and tenant settings are managed in SmartFlow.

## Target user

- Tenant administrators and business owners.
- German-first local service businesses managing company preferences.

## Business rules

- Each tenant company has its own settings record.
- Settings should control integration flags and behavior defaults.
- Company settings should not cross tenant boundaries.

## Required fields

- company_id
- default lead behavior values

## Optional fields

- lead auto-assign enabled
- default lead source
- reminder default hours
- Brevo integration enabled
- Make.com integration enabled
- Stripe integration enabled

## User flow

1. Company admin opens company settings.
2. Admin configures behavior defaults and integrations.
3. Settings are stored for the tenant company.
4. Downstream workflows and automations read the settings.

## Database impact

- Store a single `settings` row per company.
- Enforce uniqueness on `company_id`.
- Keep settings tenant-scoped via `company_id`.

## Automation impact

- Automation logic should read company settings before triggering actions.
- Integration flags control whether Brevo, Make.com, or Stripe automations run.
- Settings determine default behavior for lead handling and reminders.

## UI requirements

- Show company-specific configuration clearly.
- Keep the settings interface simple and task-focused.
- Use German-first labels and descriptions.

## Out of scope

- Company subscription management.
- Multi-company account administration.
- Custom workflow builder configuration.

## Acceptance criteria

- Company settings can be created and updated per tenant.
- Settings remain scoped to the tenant company.
- Integration flags are available for downstream automation checks.
