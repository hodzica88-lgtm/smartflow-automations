# SmartFlow API

## Purpose

This document describes the API architecture and integration approach for SmartFlow. The current foundation uses Supabase as the backend platform, with server-side APIs built on Next.js and a future roadmap to expose stable endpoints for automation and integration.

## Architectural Approach

- Use Supabase Auth for authentication and session handling.
- Keep the client-server contract minimal and typed.
- Use server actions, route handlers, and service-side helpers for secured operations.
- Keep public endpoints lightweight and protected by authentication or webhook validation.

## Authentication

- End users authenticate through Supabase Auth.
- Session handling uses server-side Supabase client helpers.
- Server-only secrets such as `SUPABASE_SERVICE_ROLE_KEY` remain in the backend environment.
- Public requests are validated with session cookies or webhook signatures.

## API Surface

### Client-facing API

- Protected application APIs should support lead creation, onboarding, dashboard metrics, and reminder management.
- Use Next.js App Router server actions for form-submit flows and state transitions.
- Keep sensitive logic on the server, with client UI using only sanitized results.

### Webhook API

- Reserve inbound webhook endpoints for Make.com and external integrations.
- Validate payloads aggressively and reject mismatched tenant references.
- Map webhook events to deterministic actions in the tenant database.

### Service API

- Use the Supabase service role client on trusted server code for administrative operations.
- Restrict service APIs to internal jobs, onboarding provisioning, subscription updates, and maintenance tasks.

## Data Access Patterns

- Read dashboard and lead metrics with optimized queries that filter by `company_id`.
- Protect all queries using tenant scope and user ownership checks.
- Use aggregates only for safe reporting and avoid exposing raw tenant IDs in client payloads.

## Integration Configuration

Required environment variables for API functionality:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BREVO_API_KEY` (optional)
- `BREVO_SENDER_EMAIL` (optional)
- `BREVO_SENDER_NAME` (optional)
- `MAKE_API_KEY` (optional)
- `MAKE_WEBHOOK_URL` (optional)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional)
- `STRIPE_SECRET_KEY` (optional)
- `STRIPE_WEBHOOK_SECRET` (optional)

## Naming Conventions

- Keep API paths resource-oriented.
- Use nouns for resources (`/leads`, `/reminders`, `/companies`).
- Use verbs only for actions that do not fit REST semantics (`/auth/login`, `/webhooks/make`).
- Prefer `POST` for creation and actions, `GET` for safe reads, `PATCH` for updates, and `DELETE` for removals.

## Error Handling

- Return clear, actionable error messages for validation failures.
- Avoid leaking implementation details or keys in error responses.
- Log server-side failures for diagnostics while keeping client responses user-friendly.

## Versioning Strategy

- Version the public API once external clients depend on it.
- Use a path-based versioning scheme such as `/api/v1/...`.
- Keep internal server actions and route handlers decoupled from public API versioning when possible.

## Observability and Monitoring

- Track API response times and error rates for critical endpoints.
- Log webhook receipts and dispatch results.
- Monitor integration status for Make.com, Brevo, Stripe, and Supabase.

## Security Best Practices

- Enforce CSRF protections and secure session cookies.
- Use HTTPS for all external callbacks and webhook endpoints.
- Validate integration payloads and signatures.
- Never expose service role keys or secret tokens in client bundles.
