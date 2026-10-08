# Multi-instance capacity experiment

The single-instance release `5d966a11` completed the shared-login, empty-company
burst at 1000/1000 requests, with p95 27.49 seconds and a 30-second request
timeout. This is not a measurement of 1000 independent active users, filled
companies, or sustained traffic. The VPS has 8 available CPUs and approximately
21 GiB available RAM. During the measured 500-request burst the app used
137–190% CPU and at most 339 MiB RAM. Multiple instances are a hypothesis to
measure, not an established fix for the latency.

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
