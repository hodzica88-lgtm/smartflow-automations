# SPEC-004: Automation Rules

## Purpose

Define how SmartFlow uses automation safely and predictably while preserving tenant scope.

## Target user

- Tenant administrators configuring automations.
- Business users relying on follow-up workflows.

## Business rules

- Automations must be transparent and explicit.
- Do not automatically book appointments.
- Keep automations tenant-isolated.
- Respect business hours unless overridden by configuration.

## Required fields

- tenant company context
- automation trigger source
- target action type

## Optional fields

- reminder parameters
- email template values
- external webhook payload data

## User flow

1. A lead or reminder event triggers an automation.
2. SmartFlow evaluates the tenant settings and workflow rules.
3. The automation executes a follow-up action or external integration.
4. The outcome is logged and made visible to the tenant.

## Database impact

- Automations should reference `company_id` for tenant scoping.
- Store action metadata, if needed, in tenant-specific tables.
- Use settings to determine whether a given automation path is enabled.

## Automation impact

- Trigger follow-up reminders, notifications, and external webhooks.
- Keep Make.com and email automations separate from core lead intake.
- Do not create appointments automatically.

## UI requirements

- Show automation status and enabled integration flags.
- Keep automation controls transparent and easy to understand.
- Use German-first interface language.

## Out of scope

- Custom workflow builder.
- Appointment booking automation.
- Complex multi-step orchestration beyond basic integrations.

## Acceptance criteria

- Automation rules are documented per tenant and per trigger type.
- Tenant isolation is maintained in automation logic.
- Automatic appointment booking is explicitly excluded.
