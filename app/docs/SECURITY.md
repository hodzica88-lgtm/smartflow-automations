# Security

## Applied Hardening
- Global security headers configured in `next.config.ts` via `src/shared/config/securityHeaders.ts`.
- Standardized API error responses with event IDs in `src/shared/lib/http/errors.ts`.
- Safe server logger with redaction in `src/shared/lib/observability/logger.ts`.
- Internal API protection via `x-internal-api-secret` for sensitive endpoints.

## CI Security Scans (Free)
- Workflow: `.github/workflows/security-scans.yml`
- Included jobs:
  - GitHub Dependency Review
  - GitHub CodeQL
  - Gitleaks
  - Trivy filesystem scan
  - `pnpm audit --prod --audit-level high`

## Dependency Automation
- Dependabot config: `.github/dependabot/dependabot.yml`
- Weekly dependency updates.

## Secrets Policy
- No real secrets in repository.
- Use GitHub Actions secrets and Supabase/hosting secret stores only.
