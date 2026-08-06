# Penetration Testing

## Safety Rules
- Never run aggressive scans against production domains.
- Repository workflows explicitly block `https://varnito.de` and `https://varnito.com` for ZAP baseline.
- Internal baseline checks are read-only.

## Local Baseline
- Script: `scripts/security/pentest-baseline.sh`
- Validates:
  - `/api/health` is reachable
  - `/api/internal/health` is protected
  - `/api/ready` is protected
  - protected pages redirect for unauthenticated users

## CI Pentest Workflow
- Workflow: `.github/workflows/pentest-suite.yml`
- Jobs:
  - Local baseline checks on built app
  - Optional OWASP ZAP baseline against non-production target from `vars.PENTEST_TARGET_URL`

## Free Tools Used
- curl
- GitHub Actions
- OWASP ZAP baseline action
