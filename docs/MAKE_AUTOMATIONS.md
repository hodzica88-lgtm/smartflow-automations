# SmartFlow Automation Strategy

## Purpose

This document captures the long-term automation strategy for SmartFlow. It focuses on using Make.com and email automation as a platform extension for service-based workflows.

## Automation Vision

SmartFlow automations should help customers move faster by reducing manual follow-up, ensuring consistent outreach, and connecting inbound requests to operational actions.

## Automation Principles

- Keep automations transparent and easy to understand.
- Build around explicit triggers and predictable actions.
- Preserve tenant isolation in every workflow.
- Prefer server-side orchestration over client-side event dispatch.
- Make it easy to extend automations with new integrations later.

## Core Automation Use Cases

### Lead Capture

- Automatically ingest inquiries from web forms, email, or external services.
- Normalize incoming data into the `leads` table.
- Tag lead source and status for tracking.

### Follow-Up Reminders

- Create reminders for new and open leads.
- Send notifications when a reminder becomes due.
- Allow snoozing and rescheduling from the product UI.

### Email Outreach

- Use email automation to confirm receipt of customer inquiries.
- Send follow-up emails for lead qualification or next steps.
- Build templates that can be personalized using lead fields.

### Workflow Orchestration

- Route lead updates into additional systems through Make.com or other ETL tools.
- Coordinate multi-step actions such as appointment booking, task creation, and status changes.
- Support both inbound webhooks and scheduled automation triggers.

## Integration Design

### Make.com Integration

- Reserve a dedicated `MAKE_API_KEY` and `MAKE_WEBHOOK_URL` in the server environment.
- Use Make.com for external workflow orchestration and third-party data exchange.
- Keep webhook endpoint handlers small and secure.
- Validate webhook payloads and enforce tenant scope before processing.

### Email Automation

- Reserve Brevo integration fields for transactional and follow-up email delivery.
- Keep sender identity explicit with `brevoSenderEmail` and `brevoSenderName`.
- Use templated email content that maps directly to lead and company data.
- Track email success/failure state in operational logs or a future notification table.

### Stripe and Billing

- Keep billing integrations isolated behind server-side secrets.
- Use Stripe only for paid subscription management and billing events.
- Do not expose secret keys to the client.

## Data Flow

1. Customer inquiry enters SmartFlow through a recognized trigger.
2. The request is normalized and persisted in the tenant-scoped database.
3. Automated actions fire based on lead source, status, or schedule.
4. External integrations receive events through Make.com or direct provider APIs.
5. The product reflects the automation outcome in dashboards and reminders.

## Operational Safeguards

- Rate-limit inbound automation events to prevent abuse.
- Log automation failures for visibility and support.
- Provide safe retry semantics for webhook delivery.
- Clearly label automated updates in the UI to avoid confusion.

## Long-Term Automation Goals

- Ship a library of prebuilt automation templates for common service workflows.
- Add a workflow editor for custom automation rules.
- Expose a secure webhook API for partners and advanced users.
- Build reporting on automation efficiency and lead conversion.
