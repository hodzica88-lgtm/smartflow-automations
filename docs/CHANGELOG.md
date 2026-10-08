# Changelog

All notable changes to SmartFlow should be documented in this file.

## [Unreleased]

### Dashboard concurrency optimization
- Coalesce only overlapping company-access, billing, team, and unread-notification reads per process; remove each new in-flight entry on success or failure.
- Preserve tenant/user keys, owner/member modes, explicit billing evaluation times, and existing notification-cache behavior.
- Add regression coverage for concurrent sharing, isolation, fresh reads, failure/retry, and revoked membership.
- Release gate: merge the separate public-help/demo validation fix first, then require green lint, typecheck, unit/integration tests, production build, CodeQL, and E2E before releasing the optimization.
- Capacity is unverified until the same isolated authenticated dashboard load profiles are rerun after deployment; a shared-user/company burst does not establish capacity across many independent tenants.

- Initial SaaS foundation documentation created.
- Added enterprise-ready project governance and product vision.
- Documented database design, API architecture, automation strategy, roadmap, and UI guidelines.

## [0.1.0] - Initial Foundation

### Added
- Next.js App Router architecture for SmartFlow.
- Supabase-backed authentication and tenant model.
- Onboarding flow for company provisioning.
- Dashboard metrics for lead and reminder tracking.
- Placeholder integration readiness for Brevo, Make.com, and Stripe.
- Documentation of core architecture and product decisions in `app/docs`.

### Notes
- This release represents the initial launch foundation and establishes the long-term SaaS platform direction.
