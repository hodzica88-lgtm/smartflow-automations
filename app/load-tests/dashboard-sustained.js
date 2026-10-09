import http from "k6/http";
import encoding from "k6/encoding";
import execution from "k6/execution";
import { fail, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const fixture = JSON.parse(open(__ENV.FIXTURE_PATH));
if (!fixture.run_id || fixture.accounts?.length !== 50 || fixture.markers?.length !== 5 ||
    fixture.base_url !== "https://varnito.com") fail("Unexpected capacity fixture");
const duration = new Trend("dashboard_duration", true);
const waiting = new Trend("dashboard_waiting", true);
const receiving = new Trend("dashboard_receiving", true);
const responseChars = new Trend("dashboard_response_chars");
const success = new Rate("dashboard_success");
const okCount = new Counter("dashboard_ok");
const failed = new Counter("dashboard_failed");
const isolationFailures = new Counter("tenant_mismatch");
const targetRate = Number(__ENV.CAPACITY_RPS || "20");
if (![5, 10, 20].includes(targetRate)) fail("CAPACITY_RPS must be 5, 10, or 20");

export const options = {
  setupTimeout: "5m",
  scenarios: {
    dashboard: {
      executor: "ramping-arrival-rate", startRate: 1, timeUnit: "1s",
      preAllocatedVUs: 100, maxVUs: 200,
      stages: [
        { duration: "30s", target: Math.max(1, Math.round(targetRate / 4)) },
        { duration: "30s", target: Math.round(targetRate / 2) },
        { duration: "30s", target: targetRate },
        { duration: "120s", target: targetRate },
        { duration: "30s", target: Math.max(1, Math.round(targetRate / 4)) },
      ],
      gracefulStop: "30s",
    },
  },
  thresholds: {
    dashboard_success: [{ threshold: "rate>0.99", abortOnFail: true, delayAbortEval: "30s" }],
    tenant_mismatch: [{ threshold: "count==0", abortOnFail: true }],
    dashboard_duration: ["p(95)<5000", "p(99)<10000"],
    dropped_iterations: ["count==0"],
  },
  summaryTrendStats: ["avg", "p(95)", "p(99)", "max"],
};

function validateDashboard(response, account) {
  const body = response.body || "";
  const wrongTenant = fixture.markers.some((marker) => marker !== account.marker && body.includes(marker));
  if (wrongTenant) {
    isolationFailures.add(1);
    execution.test.abort("Foreign test-company marker in dashboard response");
  }
  return response.status === 200 && body.includes(account.marker);
}

function getDashboard(account, page = 1) {
  // Clear any Set-Cookie state from the preceding account, including during setup.
  http.cookieJar().clear(fixture.base_url);
  return http.get(`${fixture.base_url}/dashboard/leads?page=${page}`, {
    headers: { Cookie: account.cookie }, redirects: 0, timeout: "30s",
    tags: { name: "dashboard/leads" },
  });
}

export function setup() {
  const ref = fixture.supabase_url.match(/^https:\/\/([^.]+)\.supabase\.co$/)?.[1];
  if (!ref) fail("Unexpected Supabase project URL");
  const accounts = [];
  for (const account of fixture.accounts) {
    const login = http.post(`${fixture.supabase_url}/auth/v1/token?grant_type=password`,
      JSON.stringify({ email: account.email, password: account.password }), {
        headers: { apikey: fixture.anon_key, "Content-Type": "application/json" },
        timeout: "30s", tags: { name: "fixture/login" },
      });
    if (login.status !== 200) fail(`Fixture login failed: HTTP ${login.status}`);
    const session = login.json();
    if (session.user?.id !== account.user_id || session.expires_in < 600) fail("Unexpected fixture session");
    const encoded = "base64-" + encoding.b64encode(JSON.stringify(session), "rawurl");
    const cookies = [];
    for (let offset = 0; offset < encoded.length; offset += 3180) {
      const suffix = encoded.length > 3180 ? `.${offset / 3180}` : "";
      cookies.push(`sb-${ref}-auth-token${suffix}=${encoded.slice(offset, offset + 3180)}`);
    }
    const authenticated = { marker: account.marker, pages: account.pages, cookie: cookies.join("; ") };
    if (!validateDashboard(getDashboard(authenticated), authenticated)) {
      fail("Populated dashboard preflight failed; sustained load was not started");
    }
    accounts.push(authenticated);
    // Password-grant requests are paced; only one login per independent account.
    sleep(2.1);
  }
  console.log(`Preflight passed: 5 companies, 50 accounts, 2500 populated leads. Starting 4-minute load up to ${targetRate} requests/second.`);
  isolationFailures.add(0);
  return accounts;
}

export default function loadDashboard(accounts) {
  const iteration = execution.scenario.iterationInTest;
  const account = accounts[iteration % accounts.length];
  const page = 1 + (Math.floor(iteration / accounts.length) % account.pages);
  const response = getDashboard(account, page);
  duration.add(response.timings.duration);
  waiting.add(response.timings.waiting);
  receiving.add(response.timings.receiving);
  responseChars.add((response.body || "").length);
  const valid = validateDashboard(response, account);
  success.add(valid);
  (valid ? okCount : failed).add(1);
}

export function handleSummary(data) {
  const value = (name, field, fallback = 0) => data.metrics[name]?.values?.[field] ?? fallback;
  return { stdout: [
    "", "Varnito populated dashboard sustained test",
    "Fixture: 5 companies / 50 independent accounts / 2500 leads + history",
    `Load: 4 minutes, ramp to ${targetRate} dashboard requests/second`,
    `Successful requests: ${value("dashboard_ok", "count")}`,
    `Failed requests: ${value("dashboard_failed", "count")}`,
    `Success rate: ${value("dashboard_success", "rate") * 100}%`,
    `Tenant mismatches: ${value("tenant_mismatch", "count")}`,
    `Dropped iterations: ${value("dropped_iterations", "count")}`,
    `Dashboard average: ${value("dashboard_duration", "avg", "n/a")} ms`,
    `Dashboard p95: ${value("dashboard_duration", "p(95)", "n/a")} ms`,
    `Dashboard p99: ${value("dashboard_duration", "p(99)", "n/a")} ms`,
    `Dashboard maximum: ${value("dashboard_duration", "max", "n/a")} ms`,
    `Time to first byte p95: ${value("dashboard_waiting", "p(95)", "n/a")} ms`,
    `Response receiving p95: ${value("dashboard_receiving", "p(95)", "n/a")} ms`,
    `HTML response characters average: ${value("dashboard_response_chars", "avg", "n/a")}`,
    "Dashboard timings exclude setup and login. Acceptance: >99% valid responses, p95 <5s, p99 <10s, zero tenant mismatches or dropped iterations.",
    "",
  ].join("\n") };
}
