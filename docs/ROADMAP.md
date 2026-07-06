# SmartFlow Roadmap

## Goal

Align SmartFlow product and platform priorities for long-term SaaS growth.

## Current Foundation

- Next.js App Router architecture
- Supabase backend with user and tenant model
- Onboarding flow for company creation
- Dashboard metrics for leads, reminders, and contact activity
- Integration-ready environment boundaries for Brevo, Make.com, Stripe, and Supabase

## Phase 1: Launch Foundation

### Focus
- Deliver reliable onboarding and tenant provisioning.
- Capture leads and surface them in a central dashboard.
- Provide reminder management and status reporting.
- Validate the product with early users in service industries.

### Goals
- Complete user onboarding and company setup.
- Build secure tenant scoping and session handling.
- Add robust lead and reminder workflows.
- Validate core product fit with sample use cases.

### Foundational specifications
- `docs/SPECS/SPEC-001-Lead-Intake.md`
- `docs/SPECS/SPEC-002-Lead-Management.md`
- `docs/SPECS/SPEC-003-Company-Settings.md`
- `docs/SPECS/SPEC-004-Automation-Rules.md`
- `docs/SPECS/SPEC-005-Dashboard.md`

## Phase 2: Automation and Integrations

### Focus
- Enable external workflows through Make.com and email automations.
- Add integration points for lead intake and follow-up.
- Support transactional email delivery and notifications.

### Goals
- Ship Make.com webhook support and workflow templates.
- Add automated email follow-ups using Brevo integration.
- Introduce subscription trialing and billing state management.
- Improve lead conversion tracking and status history.

## Phase 3: Scale and Expand

### Focus
- Make SmartFlow more flexible for teams and multiple users.
- Add advanced reporting and analytics.
- Build a platform for partner integrations and automation rules.

### Goals
- Add multi-user companies and role-based access.
- Support advanced automation templates and custom workflow rules.
- Add activity streams, reporting, and conversion analytics.
- Harden security, audit logging, and operational visibility.

## Phase 4: Enterprise Readiness

### Focus
- Prepare SmartFlow for larger tenant adoption.
- Strengthen compliance, reliability, and extensibility.

### Goals
- Add formal RBAC and tenant membership controls.
- Introduce enterprise-grade auditing and data export.
- Improve performance for high-lead-volume companies.
- Expand integrations to calendaring, payment gateways, and CRM connectors.

## Execution Cadence

- Review the roadmap quarterly.
- Use short, outcome-oriented sprints for each phase.
- Keep documentation up to date with delivered features.
- Maintain an `Unreleased` section in `docs/CHANGELOG.md` for upcoming work.

## Success Measurements

- Faster onboarding and product activation.
- Higher lead response rate and fewer missed follow-ups.
- Clear integration adoption and automation usage.
- Increased retention through recurring subscription value.
