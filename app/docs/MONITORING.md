# Monitoring

## Scope
- Public health endpoint: `GET /api/health` returns `{ "status": "ok" }`.
- Internal readiness endpoint: `GET /api/ready` requires `x-internal-api-secret`.
- Internal diagnostic endpoint: `GET /api/internal/health` requires `x-internal-api-secret`.

## Free Monitoring Setup
1. Enable GitHub Actions in the repository.
2. Keep `.github/workflows/monitoring-checks.yml` active.
3. Verify scheduled checks run every 15 minutes.
4. Add free notification channels in GitHub Actions:
   - Email notifications in GitHub account settings.
   - Optional Slack/Teams webhook via repository Action secrets.

## Manual Verification
- `curl https://varnito.de/api/health`
- `curl https://varnito.com/api/health`
- `INTERNAL_API_SECRET=... bash scripts/operations/check-system-health.sh`

## Notes
- No production write operations are performed by monitoring checks.
- DE and US domains are monitored independently.
