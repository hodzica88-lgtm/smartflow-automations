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

The first completed populated four-minute test (5 companies, 50 independent
accounts, 2500 leads) did **not** pass at a target of 20 requests/second:
2593 valid responses, no request failures or foreign fixture markers, but
946 dropped iterations, average 9.97s, p95 19.22s, p99 20.76s, maximum 23.87s.
All four containers remained healthy with zero restarts and no OOM flag. k6
reached its 200-VU limit; the target arrival schedule was not delivered in full.
These results do not prove where the delay occurred, and increasing the VU
limit does not address the failed latency target. Cleanup started afterward;
its final result must be confirmed separately.

The monitored Windows run at five requests/second also missed latency gates:
899 valid responses, no failures/foreign markers/dropped iterations, average
1.29s, p95 6.94s, p99 12.11s, maximum 16.29s. First-byte p95 was 71.6ms,
receiving p95 6.89s, and average decoded HTML length 777941 characters.
Sampled per-container CPU peaks were 109–128% and RAM peaks 181–411MiB.
These non-simultaneous sampled CPU maxima do not establish host saturation;
receiving includes streamed server generation, not only network transfer.
The next run's empty-ledger guard confirmed no pending fixtures before starting
the VPS comparison; no production app configuration was changed.

The version-matched k6 2.2.0 VPS run at five requests/second passed all gates:
899 valid responses, zero failures/foreign markers/dropped iterations, average
580.05ms, p95 697.59ms, p99 800.00ms, maximum 1292.29ms. First-byte p95 was
41.06ms, receiving p95 669.17ms, average decoded HTML again 777941 characters.
All app containers stayed healthy with no restarts or OOM flags. Sampled app
CPU peaks were 73–99%, RAM 155–247MiB; the client peaked at 36.81% CPU and
621.90MiB RAM. The client/private copy were removed, and fixture cleanup
confirmed five companies and 50 accounts removed.

| Five-request/s populated run | Average | p95 | p99 | Dropped | Valid |
| --- | --- | --- | --- | --- | --- |
| Windows, no explicit Accept-Encoding | 1286.92ms | 6937.49ms | 12109.47ms | 0 | 899/899 |
| VPS, no explicit Accept-Encoding | 580.05ms | 697.59ms | 800.00ms | 0 | 899/899 |

The VPS p95 was approximately 90% lower, but colocated latency does not establish
external-client performance or sustained capacity at 20 requests/second. The
difference warrants investigating runner/network/transfer effects rather than
concluding that server processing alone caused the Windows delay. Protocol and
negotiated encodings were not included in the supplied preflight log.

The VPS response-header metric reported 0% compressed responses. Neither prior
script explicitly requested an encoding; this does not by itself prove the
browser-facing server lacks compression. Subsequent dashboard requests explicitly
send `Accept-Encoding: gzip`, including setup, and report that negotiation in
the preflight and summary. The next comparison repeats the Windows five-request/s
workload with this single request-header change and the same gates; it changes
no app image or Caddy configuration. Compression support must be confirmed from
the returned Content-Encoding; requesting gzip does not guarantee its use.
The body-character metric remains decoded HTML length even for gzip responses.

The external Windows gzip run at five requests/second passed: 900 valid
responses, no errors/foreign markers/dropped iterations, average 579.04ms,
p95 680.36ms, p99 754.30ms, maximum 946.90ms, 100% gzip responses. First-byte
p95 was 59.97ms and receiving p95 630.33ms. All containers stayed healthy with
zero restarts/OOM; cleanup confirmed five companies and 50 accounts removed.
The observed p95 reduction of approximately 90% supports compression/transfer
effects as a major factor in the previous lower-rate external latency.

The later Windows gzip run at 20 requests/second did not pass: 2857 valid
responses, no HTTP failures or foreign fixture markers, 682 dropped iterations,
average 8888.45ms, p95 14841.49ms, p99 15548.95ms, maximum 16101.53ms. Responses
were 100% gzip over HTTP/2, first-byte p95 960.77ms, receiving p95 14505.03ms,
decoded HTML average 777933 characters. Sampled individual CPU peaks were
199–319%, RAM 878–1139MiB; peaks were not necessarily simultaneous. Containers
stayed healthy with zero restarts/OOM and cleanup confirmed 5/50 removal. k6
reached 200 VUs. Raising that cap would not fix the failed latency gates.
The sequential batch reached this step only after the 10-request/s step
succeeded; the numerical 10-request/s summary has not yet been supplied.

## Prepared lead-rendering improvement

The candidate keeps 50 leads per page, the same cards, fields, outcomes,
assignment choices, full displayed history, filtering and existing tenant checks.
`LeadCards` renders behind one client boundary, carrying only the displayed
card data and one shared assignee list instead of serializing the entire repeated
card/form element tree into the RSC payload. It still prerenders the initial
HTML and passes the existing authenticated Server Action as a prop; native
multipart submission works before JavaScript. The component imports presentation
constants only, never server clients or credentials. Dates and history labels
are assembled on the server to preserve timezone and keep extra user/profile
fields out of the client props. The formatter is reused within the process.

An isolated production Next.js check with 50 synthetic cards compared the
same presentation as a server tree and as the new client boundary: 610012 vs
257362 response characters, mean 48ms vs 15ms across 12 interleaved samples.
The 50 initial article/form HTML fragments were identical, synthetic script text
was escaped, and native multipart status/assignee changes returned the expected
303 redirect. This isolates transport/render behavior without a database; it
does not predict the live 20-request/s result. The client boundary adds browser
JavaScript/hydration, and production acceptance must be repeated after all four
instances are deployed from the same new immutable image. No database query,
authorization, update logic, caching or schema change is part of this patch.

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
The runner also accepts `-RequestsPerSecond 5`, `10` or `20` (default 20), passed
to the test as `CAPACITY_RPS`. The four-minute ramp/hold pattern and latency,
success, isolation and dropped-iteration gates stay identical; a lower-rate pass
must be reported at that rate rather than as a pass at 20. Invalid rates refuse
to run. Start with five requests/second to establish measured lower-rate behavior.

During setup and load, a temporary SSH job samples CPU and RAM for all four
containers roughly every seven seconds. The runner reports each container's
sample count and observed peaks before test-data cleanup, stopping the local job
after k6 completes or fails. The remote sampling loop has a 650-second cap and
exits on a broken output stream. Missing samples or monitoring failures warn
without skipping fixture cleanup. These are sampled peaks, not continuous maxima
or a database-timing trace. Dashboard-only time to first byte, response-receiving
time and HTML character count are also reported. Receiving time may include
waiting for streamed server content; it is not solely network transfer time.

Add `-RunOnVps` to run through `https://varnito.com` from a temporary k6 Docker
client on the same VPS, using host networking. The Windows k6 release version
is parsed and the corresponding official `grafana/k6:<version>` image is pulled
before creating fixtures; the actual immutable image ID is pinned for the run.
The client uses the VPS user's UID, read-only fixture/script mounts, no added
capabilities and no-new-privileges. It has a 2GiB memory cap and no CPU cap;
client resource samples are reported separately as `k6-client`. This colocated
runner shares VPS resources, so its CPU/memory use must be considered when
interpreting the comparison. Runner OS/network routing also differ from Windows.

Its private fixture copy and image/run metadata live under an owner-only
`runtime/capacity-clients/<run-id>` directory. The temporary container auto-removes
after a normal exit. Cleanup verifies the exact name, run label and pinned image
before removing a remaining client, then deletes only its known private files.
It stops the client before deleting database fixtures; failed stop confirmation
retains fixture IDs and prints the two cleanup commands. A downloaded k6 image
may stay cached. Closing the terminal still requires explicit recovery by run ID.
The dashboard summary reports runner identity, compression rate and the first
preflight response's HTTP protocol/content encoding. A VPS pass does not replace
the failed external Windows latency result or prove remote-customer experience.

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
python3 scripts/operations/capacity-client.check.py
node scripts/operations/action-protocol.check.mjs
node scripts/operations/lead-render.check.mjs
node_modules/.bin/eslint scripts/operations/capacity-fixture.mjs scripts/operations/capacity-fixture.check.mjs load-tests/dashboard-sustained.js
```

The fixture checks use a simulated Auth/REST server: seed/cleanup, unchanged
cross-container actions, partial creation failure, collision refusal, changed
identity/company/member/profile refusal, and foreign data beyond a page boundary.
An isolated real Next.js app reproduces the ignored URL-encoded POST and checks
the multipart action's 303 success redirect without connecting to production.
The client checks verify private file permissions, exact cleanup, mismatched
container-label and unknown-file refusal, and pinned-image runner arguments.
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
