# Multi-instance capacity experiment

The single-instance release `5d966a11` completed the shared-login, empty-company
burst at 1000/1000 requests, with p95 27.49 seconds and a 30-second request
timeout. This is not a measurement of 1000 independent active users, filled
companies, or sustained traffic. The VPS has 8 available CPUs and approximately
21 GiB available RAM. During the measured 500-request burst the app used
137–190% CPU and at most 339 MiB RAM.

The four-instance experiment completed on the same release, empty fixture,
Windows runner, shared login, URL, and burst script:

| Burst VUs (one iteration each) | Single-instance p95 | Four-instance p95 | Four-instance p99 | Valid responses |
| --- | --- | --- | --- | --- |
| 100 | 4.04s | 2.74s | 2.77s | 100/100 |
| 250 | 9.09s | 3.40s | 3.46s | 250/250 |
| 500 | 15.68s | 5.68s | 5.98s | 500/500 |
| 1000 | 27.49s | 8.26s | 8.42s | 1000/1000 |

All four containers remained healthy with zero restarts after the final bursts.
These durations include the one setup login in the existing global metric.
The 1000-VU p95 improved approximately 70%; the 5-second p95 target is still
missed at 500 and 1000 VUs. `CAPACITY_ONLY=true` accepted success rate only.
This does not establish enterprise readiness or independent-user capacity.

## Start and verify replicas

Run from `/opt/anfragepilot/app`:

```bash
bash scripts/operations/scale-app.sh start
```

This starts three additional replicas at loopback ports 3001–3003. The existing
primary at 3000 and the other service at 3100 are untouched. The script pins a
local image tag to the primary's actual immutable image ID; it does not build or
pull another image. All four image IDs and Docker health states must agree.
No production requests reach the replicas until Caddy is switched.
The script also compares hashes of the container environments without printing
their values. For an isolated tooling checkout, set `VARNITO_APP_DIR` to the
live app directory; the primary remains on its existing checkout and image.
If startup partially fails, the original public route remains active; run
`scale-app.sh stop` before retrying. Configuration validation is quiet to avoid
printing resolved environment values.

## Switch traffic

```bash
sudo python3 scripts/operations/scale-caddy.py activate
```

Activation requires four healthy containers using the same image. It replaces
only the exact reviewed `varnito.de, varnito.com` block in `/etc/caddy/Caddyfile`.
It preserves the www redirects and unrelated site blocks, validates before
replacement, writes a root-only backup and recovery record under
`/var/lib/varnito-scale`, reloads Caddy, and checks the resulting upstream set.
Reload or verification failure restores and reloads the previous file.
Balancing uses `least_conn`, active `/api/health` checks, and passive connection
and 5xx failure handling. It does not enable application-request retries.

Repeat smoke, 100, 250, 500, and 1000 against the same company and login, with
the same Windows runner, URL, and script. Record p95/p99, failures, CPU, health,
and restarts. Then test populated companies and independent logins with a
controlled arrival rate and a longer duration. Also verify a Server Action
after routing between instances, redirects, and cache freshness before
accepting this topology for normal production use.

## Populated fixture and sustained acceptance

`scripts/operations/run-capacity-test.ps1` runs from Windows PowerShell against
an isolated tooling checkout of this branch. It checks matching healthy images,
then creates exactly five new companies, 50 independent accounts (one owner and
nine active members per company), 2500 synthetic leads and 4375 history rows.
Brevo, Make, Stripe and auto-assignment are disabled; auth accounts are created
confirmed through the admin endpoint, with no invitation emails. Fixture
creation uses direct database inserts, not notification-producing intake paths.

`capacity-fixture.py` stores every preallocated UUID before any mutation in an
owner-only ledger under `/opt/anfragepilot/runtime/capacity-fixtures`. The
service-role key stays inside the primary container. The fixture's temporary
passwords are captured into a file in the Windows user's TEMP directory and
removed in `finally`; they are not printed or passed as command-line arguments.
No live checkout, app image or Caddy configuration is changed by the test.

Before returning fixture credentials, a primary-generated unchanged lead
Server Action is submitted directly to all four containers over their shared
Docker network, using the public Host/Origin. Each must return the success
redirect and the synthetic probe lead must remain unchanged. This checks action
compatibility across the current identical build; it does not implement or
validate deployment across different builds.
The probe submits native `FormData`: fetch generates `multipart/form-data` with
the correct boundary, matching React's form encoding. The initial live fixture
run stopped before sustained load because the probe sent a URL-encoded POST,
which Next.js 16 ignores as a Server Action and renders as HTTP 200. All five
companies and 50 accounts were then successfully removed. The corrected probe
retains the strict 303 success-redirect requirement; HTTP 200 is not acceptance.

`load-tests/dashboard-sustained.js` signs in once per account, paced at least
2.1 seconds apart, and verifies every account can load its populated company.
Then its four-minute arrival-rate scenario ramps 1→5→10→20 requests/second,
holds 20 for two minutes and ramps down. Requests rotate through all accounts
and ten pages of leads per company. It checks expected company markers and
aborts on a foreign fixture marker. This is a focused HTML dashboard check,
not a complete tenant-isolation or browser-asset test.

Acceptance requires >99% valid responses, dashboard-only p95 <5s/p99 <10s,
zero tenant-marker mismatches and zero dropped iterations. Login and setup are
excluded from the dashboard trend. A nonzero k6 exit fails the batch even if
HTTP success is high. Container image/restart/health checks run afterward.

Cleanup runs in PowerShell `finally` after success, setup failure or a failed
threshold. It verifies ledger IDs, auth run metadata, company names/owners,
profile company links, and all pages of leads before any deletion. Changed
identities or unknown company data refuse cleanup. Unrelated customer records
are never selected for deletion. Failed cleanup retains the server ledger and
prints the exact retry command. Closing the terminal or losing connectivity can
prevent `finally`; use the printed run ID to run that command again. An earlier
empty benchmark account is outside this ledger and is retained separately.

Local verification:

```bash
node --test scripts/operations/capacity-fixture.check.mjs
node scripts/operations/action-protocol.check.mjs
node_modules/.bin/eslint scripts/operations/capacity-fixture.mjs scripts/operations/capacity-fixture.check.mjs load-tests/dashboard-sustained.js
```

The fixture checks use a simulated Auth/REST server: seed/cleanup, unchanged
cross-container actions, partial creation failure, collision refusal, changed
identity/company/member/profile refusal, and foreign data beyond a page boundary.
An isolated real Next.js app reproduces the ignored URL-encoded POST and checks
the multipart action's 303 success redirect without connecting to production.
Live acceptance results must be recorded after the Windows/VPS run.

## Rollback and future deployments

```bash
sudo python3 scripts/operations/scale-caddy.py rollback
bash scripts/operations/scale-app.sh stop
```

Rollback refuses to overwrite a Caddyfile modified after activation. Replica
removal refuses while Caddy still routes traffic to the replica ports. Stop is
limited to the three named Compose replica services.

**Before any future app deployment, roll back Caddy and stop the replicas.**
Deploy the primary using the existing release procedure, then restart replicas
from its new image and activate Caddy again. Do not mix builds behind Caddy:
Next.js Server Action keys, assets, and build IDs must be consistent. This
experiment does not implement rolling deployments or cross-host failover.

Sessions and rate-limit state use Supabase. Queue processing claims rows using
database locks; starting replicas adds no background scheduler. Coalescing maps
are local to each instance. Existing intake (5s) and unread-count (3s) caches are
also instance-local; cache invalidation is not distributed. The dynamic
dashboard reads remain uncached. This experiment introduces no shared Redis
service and does not claim immediate cross-instance cache invalidation.

References: [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting),
[Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).
