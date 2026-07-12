import http from "k6/http";
import { check, fail } from "k6";
import exec from "k6/execution";
import { Counter, Rate, Trend } from "k6/metrics";

const createdLeads = new Counter("created_leads");
const failedLeads = new Counter("failed_leads");
const successRate = new Rate("lead_success_rate");
const leadDuration = new Trend("lead_request_duration", true);

const profiles = {
  smoke: {
    executor: "per-vu-iterations",
    vus: 1,
    iterations: 1,
    maxDuration: "1m",
  },
  "100": {
    executor: "per-vu-iterations",
    vus: 100,
    iterations: 1,
    maxDuration: "2m",
  },
  "500": {
    executor: "per-vu-iterations",
    vus: 500,
    iterations: 1,
    maxDuration: "5m",
  },
  "1000": {
    executor: "per-vu-iterations",
    vus: 1000,
    iterations: 1,
    maxDuration: "10m",
  },
};

const profileName = __ENV.PROFILE || "smoke";
const selectedProfile = profiles[profileName];

if (!selectedProfile) {
  fail(`Unknown PROFILE '${profileName}'. Use smoke, 100, 500, or 1000.`);
}

export const options = {
  scenarios: {
    lead_intake: selectedProfile,
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    lead_success_rate: ["rate>0.99"],
    http_req_duration: ["p(95)<1500", "p(99)<3000"],
  },
  discardResponseBodies: false,
};

const required = ["BASE_URL", "COMPANY_ID", "INTERNAL_API_SECRET", "RUN_ID"];
for (const key of required) {
  if (!__ENV[key]) {
    fail(`Missing required environment variable: ${key}`);
  }
}

const runId = __ENV.RUN_ID.trim();
if (!/^[a-zA-Z0-9_-]{1,64}$/.test(runId)) {
  fail("RUN_ID must contain only letters, numbers, underscores, and hyphens (maximum 64 characters).");
}

const includeQueue = (__ENV.INCLUDE_QUEUE || "false").toLowerCase() === "true";

export function setup() {
  console.log(
    `Starting Varnito load test: profile=${profileName}, runId=${runId}, includeQueue=${includeQueue}`,
  );
  return { runId };
}

export default function (data) {
  const sequence = exec.scenario.iterationInTest + 1;
  const response = http.post(
    `${__ENV.BASE_URL.replace(/\/$/, "")}/api/internal/load-test/leads`,
    JSON.stringify({
      companyId: __ENV.COMPANY_ID,
      runId: data.runId,
      sequence,
      includeQueue,
    }),
    {
      headers: {
        "content-type": "application/json",
        "x-internal-api-secret": __ENV.INTERNAL_API_SECRET,
      },
      tags: {
        endpoint: "load-test-leads",
        profile: profileName,
      },
      timeout: "30s",
    },
  );

  const ok = check(response, {
    "status is 201": (res) => res.status === 201,
    "response is ok": (res) => {
      try {
        return JSON.parse(res.body).ok === true;
      } catch {
        return false;
      }
    },
  });

  leadDuration.add(response.timings.duration);
  successRate.add(ok);

  if (ok) {
    createdLeads.add(1);
  } else {
    failedLeads.add(1);
    console.error(`Lead ${sequence} failed: status=${response.status}, body=${response.body}`);
  }
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    [`load-test-${runId}-summary.json`]: JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  const value = (name, field = "value") => metrics[name]?.values?.[field] ?? "n/a";

  return [
    "",
    "Varnito load test summary",
    `Run ID: ${runId}`,
    `Profile: ${profileName}`,
    `Created leads: ${value("created_leads", "count")}`,
    `Failed leads: ${value("failed_leads", "count")}`,
    `Success rate: ${value("lead_success_rate", "rate")}`,
    `Average duration: ${value("http_req_duration", "avg")} ms`,
    `p95 duration: ${value("http_req_duration", "p(95)")} ms`,
    `p99 duration: ${value("http_req_duration", "p(99)")} ms`,
    "",
  ].join("\n");
}
