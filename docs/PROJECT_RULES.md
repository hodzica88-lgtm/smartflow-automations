# SmartFlow Project Rules

## Purpose

This document defines the standards and conventions that keep SmartFlow maintainable, secure, and scalable as a long-term SaaS product.

## Code Quality

- Write code that is easy to read and reason about.
- Prioritize explicit domain boundaries over clever single-file shortcuts.
- Keep feature logic in `src/features`, shared abstractions in `src/shared`, and UI composition in `src/widgets`.
- Avoid introducing dependencies until the feature is real and justified.
- Keep route and page components thin; business logic belongs in feature modules and service helpers.

## Architecture

- Use the Next.js App Router for routing, metadata, and server rendering.
- Keep environment access centralized in `src/shared/config/env.ts`.
- Keep provider-specific integration code isolated under `src/shared/integrations`.
- Preserve clean module ownership. Shared utilities must be generic and reusable.
- Keep state and persistence concerns separate from presentation.

## Security

- Treat all sensitive keys as server-only values.
- Never expose service role secrets on the client.
- Validate external input on the server before persisting data.
- Adopt row-level security (RLS) in Supabase for tenant and user-scoped data.
- Require `company_id` scoping on all tenant-owned tables.
- Enforce least-privilege access in API and database interactions.

## Data and Database

- Use UUID primary keys for production-safe identity.
- Every table should include `created_at` and `updated_at` timestamps.
- Denormalize tenant scope through `company_id` for auditability and RLS efficiency.
- Prefer constrained enum-style values for status and source fields.
- Index foreign keys and high-cardinality filters used in dashboards and list views.

## Environment and Configuration

- Use typed environment access from `src/shared/config/env.ts`.
- Required variables should fail early with a clear message.
- Feature toggles and integration flags should be derived from runtime environment state.
- Keep client-visible environment variables prefixed with `NEXT_PUBLIC_`.

## Release Process

- Document all release decisions in `docs/CHANGELOG.md`.
- Maintain a stable trunk and use feature branches for new work.
- Use semantic versioning for public releases once shipping customers.
- Keep release notes concise and outcome-focused.

## Documentation

- Every significant feature or architectural decision should be captured in `docs/`.
- Keep docs aligned with repository structure and current product behavior.
- Use `docs/PROJECT_RULES.md` as the source of truth for team conventions.
- Update `docs/ROADMAP.md` each quarter or when priorities change.

## Quality Gates

- Run linting and type checking before merging changes: `pnpm lint`, `pnpm typecheck`.
- Validate new database schema changes against the documented tenant model.
- Review UI flows for accessibility and mobile-first responsiveness.
- Hold architecture reviews for major integration or scaling work.
