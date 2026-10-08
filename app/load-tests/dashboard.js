import http from "k6/http";
import encoding from "k6/encoding";
import { check, fail } from "k6";
import { Counter, Rate } from "k6/metrics";

const dashboardOk = new Counter("dashboard_ok");
const dashboardFailed = new Counter("dashboard_failed");
const dashboardSuccess = new Rate("dashboard_success");

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
    maxDuration: "5m",
  },
  "250": {
    executor: "per-vu-iterations",
    vus: 250,
    iterations: 1,
    maxDuration: "5m",
  },
  "500": {
    executor: "per-vu-iterations",
    vus: 500,
    iterations: 1,
    maxDuration: "10m",
  },
  "1000": {
    executor: "per-vu-iterations",
    vus: 1000,
    iterations: 1,
    maxDuration: "10m",
  },
  "2500": {
    executor: "per-vu-iterations",
    vus: 2500,
    iterations: 1,
    maxDuration: "15m",
  },
};

const profileName = __ENV.PROFILE || "smoke";
const selectedProfile = profiles[profileName];

if (!selectedProfile) {
  fail(`Unknown PROFILE '${profileName}'. Use smoke, 100, 250, 500, 1000, or 2500.`);
}

const required = [
  "BASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "TEST_EMAIL",
  "TEST_PASSWORD",
];

for (const key of required) {
  if (!__ENV[key]) {
    fail(`Missing required environment variable: ${key}`);
  }
}

const capacityOnly = (__ENV.CAPACITY_ONLY || "false").toLowerCase() === "true";

export const options = {
  scenarios: {
    dashboard: selectedProfile,
  },
  thresholds: capacityOnly
    ? {
        dashboard_success: ["rate>0.99"],
      }
    : {
        dashboard_success: ["rate>0.99"],
        http_req_duration: ["p(95)<5000", "p(99)<10000"],
      },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

export function setup() {
  const supabaseUrl = __ENV.SUPABASE_URL.replace(/[\r\n]/g, "").trim();
  const baseUrl = __ENV.BASE_URL.replace(/[\r\n]/g, "").trim();
  const anonKey = __ENV.SUPABASE_ANON_KEY.replace(/[\r\n]/g, "").trim();

  const login = http.post(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    JSON.stringify({
      email: __ENV.TEST_EMAIL,
      password: __ENV.TEST_PASSWORD,
    }),
    {
      headers: {
        apikey: anonKey,
        "content-type": "application/json",
      },
      responseType: "text",
      timeout: "30s",
    },
  );

  if (login.status !== 200) {
    fail(`Dashboard test login failed: HTTP ${login.status}`);
  }

  const session = JSON.parse(login.body);
  const refMatch = supabaseUrl.match(/^https:\/\/([^.]+)/);

  if (!refMatch?.[1]) {
    fail("Could not determine Supabase project reference.");
  }

  const cookieName = `sb-${refMatch[1]}-auth-token`;
  const encoded =
    "base64-" + encoding.b64encode(JSON.stringify(session), "rawurl");
  const cookies = [];

  for (let index = 0; index < encoded.length; index += 3180) {
    const suffix =
      encoded.length > 3180 ? `.${Math.floor(index / 3180)}` : "";
    cookies.push(`${cookieName}${suffix}=${encoded.slice(index, index + 3180)}`);
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    cookie: cookies.join("; "),
  };
}

export default function loadDashboard(data) {
  const response = http.get(`${data.baseUrl}/dashboard/leads`, {
    headers: {
      Cookie: data.cookie,
    },
    redirects: 0,
    timeout: "30s",
  });

  const ok = check(response, {
    "dashboard HTTP 200": (res) => res.status === 200,
  });

  dashboardSuccess.add(ok);

  if (ok) {
    dashboardOk.add(1);
  } else {
    dashboardFailed.add(1);
  }
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const value = (name, field, fallback = "n/a") =>
    metrics[name]?.values?.[field] ?? fallback;
  const number = (name, field, fallback = 0) => {
    const parsed = Number(value(name, field, fallback));
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    stdout: [
      "",
      "Varnito dashboard load test summary",
      `Profile: ${profileName}`,
      `Successful requests: ${number("dashboard_ok", "count")}`,
      `Failed requests: ${number("dashboard_failed", "count")}`,
      `Success rate: ${number("dashboard_success", "rate") * 100}%`,
      `Average duration: ${value("http_req_duration", "avg")} ms`,
      `p95 duration: ${value("http_req_duration", "p(95)")} ms`,
      `p99 duration: ${value("http_req_duration", "p(99)")} ms`,
      `Maximum duration: ${value("http_req_duration", "max")} ms`,
      "",
    ].join("\n"),
  };
}
