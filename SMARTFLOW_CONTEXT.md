# SMARTFLOW_CONTEXT

## 1. Product Vision

SmartFlow is a German-first SaaS product for local service businesses that captures customer inquiries, organizes leads, and supports follow-up workflows.

The product is designed to help small service providers convert inquiries into revenue by keeping inbound requests in one place, making lead follow-up reliable, and minimizing manual overhead.

## 2. Target Customers

SmartFlow serves inquiry-driven local service businesses, including:

- Handymen
- Electricians
- Plumbers
- HVAC technicians
- Roofers
- Auto workshops
- Barbers and hair salons
- Cleaning companies
- Other local service providers with incoming customer inquiries

## 3. Product Philosophy

- Keep the product simple and practical.
- Focus on customer inquiries, leads, reminders, and automation, not full CRM complexity.
- Build mobile-first, clear interfaces.
- Preserve German-first language and service-business workflows.
- Avoid inventing business logic beyond explicit requirements.

## 4. Lead Flow

- Leads enter the system through inquiry capture.
- Each lead belongs to a tenant company and is stored in a Supabase-backed tenant-safe schema.
- Leads are tracked with status, source, priority, and contact details.
- Reminders and activities help businesses act on leads.
- The business owner decides whether a lead becomes an appointment or job.

## 5. Inquiry Form Rules

Inquiry forms must stay short and simple.

Required fields:

- first name
- last name
- address
- phone
- email
- inquiry type

Optional fields:

- description (optional only)

## 6. Lead Status Rules

Lead status should remain explicit and aligned with business workflow.

Common statuses include:

- `new`
- `contacted`
- `qualified`
- `proposal`
- `won`
- `lost`
- `archived`

Do not invent additional lead statuses without explicit product requirements.

## 7. Automation Philosophy

- Automations should be transparent, predictable, and easy to understand.
- Prefer explicit triggers and server-side orchestration.
- Keep tenant isolation in every automation flow.
- Avoid over-automating appointment booking.
- Automation should support follow-up, reminders, and integration triggers.

## 8. Make.com Strategy

- Use Make.com as the external orchestration layer for third-party workflows.
- Keep webhook handlers small, secure, and tenant-aware.
- Validate incoming webhook payloads and enforce company scoping.
- Use Make.com for actions that extend SmartFlow beyond the core lead and reminder workflows.

## 9. Database Principles

- Use UUID primary keys for production-safe identity.
- Include `created_at` and `updated_at` on every table.
- Scope application data by `company_id` for multi-tenant isolation.
- Use Row Level Security in Supabase for tenant and user-scoped access.
- Keep provider-specific integration state separate from core data.
- Prefer constraints and indexed filters for status, source, and tenant fields.

## 10. UI Principles

- Build mobile-first and keep interfaces uncluttered.
- Use direct, task-focused copy.
- Keep forms short and validate input clearly.
- Avoid overwhelming users with too many options.
- Surface critical statuses clearly and use color sparingly.
- Make onboarding guided and simple.

## 11. Coding Rules

- Use strict TypeScript with the existing App Router architecture.
- Keep code modular and maintainable.
- Reuse existing utilities and avoid unnecessary new abstractions.
- Keep feature code in `src/features`, shared code in `src/shared`, and UI components in `src/widgets`.
- Do not modify unrelated files.
- Do not add dependencies without explicit request.

## 12. Security Rules

- Keep secrets and service role keys server-only.
- Never expose sensitive keys in the client bundle.
- Validate all external inputs on the server.
- Enforce least-privilege data access.
- Use Supabase RLS consistently for tenant and user data.

## 13. Workflow Rules

- SmartFlow does not automatically book appointments.
- The business owner decides whether a lead becomes an appointment or job.
- Notifications should respect business hours unless explicitly configured otherwise.
- Keep workflows consistent with local service business processes.

## 14. Definition of Done

A task is done when:

- It meets the explicit requirements and requested scope.
- It does not change unrelated files or existing business behavior.
- It uses existing repository structure and conventions.
- It preserves security and tenant scoping.
- It passes type checking and lints cleanly for affected files.
- Documentation is updated only if the task changes documented behavior.
