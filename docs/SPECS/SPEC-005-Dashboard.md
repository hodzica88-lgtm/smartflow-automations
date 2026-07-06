# SPEC-005: Dashboard

## Purpose

Define the SmartFlow dashboard experience for lead and reminder visibility.

## Target user

- Local service business owners and staff monitoring inbound leads.
- German-first companies needing quick operational visibility.

## Business rules

- The dashboard shows lead and reminder metrics clearly.
- It must support tenant-scoped visibility only.
- The dashboard should not replace the business owner’s decision-making.

## Required fields

- leads received
- leads contacted
- open leads
- reminders pending

## Optional fields

- last lead details
- brief summary cards

## User flow

1. User opens the dashboard.
2. The dashboard displays tenant-specific lead metrics.
3. The user reviews open leads and reminder counts.
4. The user navigates to lead or reminder details for follow-up.

## Database impact

- Read lead and reminder aggregates filtered by `company_id`.
- Use efficient queries on status and timestamps.
- Keep dashboard metrics tenant-scoped.

## Automation impact

- Dashboard should reflect updates from automations and reminders.
- Lead status changes and reminder triggers should surface in metrics.
- Keep automation state separate from dashboard read paths.

## UI requirements

- Present a clear summary of key metrics.
- Keep the layout uncluttered and mobile-friendly.
- Use German-first labels and direct summaries.

## Out of scope

- Full analytics or reports beyond current lead/reminder metrics.
- Custom dashboard widgets.

## Acceptance criteria

- The dashboard shows tenant-specific lead and reminder metrics.
- Metrics are updated based on current lead and reminder state.
- The dashboard remains simple and focused on operational actions.
