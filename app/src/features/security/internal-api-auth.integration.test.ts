import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/config/env", () => ({
  loadServerEnv: vi.fn(() => ({
    internalApiSecret: "internal-secret",
  })),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: vi.fn(),
}));

const healthRoute = await import("@/app/api/internal/health/route");
const loadTestRoute = await import("@/app/api/internal/load-test/leads/route");

describe("tenant isolation: internal API auth", () => {
  afterEach(() => {
    delete process.env.LOAD_TEST_ENABLED;
  });

  it("rejects unauthenticated access to internal health route", async () => {
    const response = await healthRoute.GET(
      new Request("http://localhost/api/internal/health"),
    );

    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated access to internal load-test route", async () => {
    process.env.LOAD_TEST_ENABLED = "true";

    const response = await loadTestRoute.POST(
      new Request("http://localhost/api/internal/load-test/leads", {
        body: JSON.stringify({
          companyId: "00000000-0000-4000-8000-000000000001",
          includeQueue: false,
          runId: "run-1",
          sequence: 1,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });
});