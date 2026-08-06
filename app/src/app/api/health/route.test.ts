import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  shouldThrow: false,
  shouldReturnError: false,
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: vi.fn(() => {
    if (state.shouldThrow) {
      throw new Error("db unavailable");
    }

    return {
      from() {
        return {
          select() {
            return {
              async limit() {
                return {
                  data: null,
                  error: state.shouldReturnError ? new Error("query failed") : null,
                };
              },
            };
          },
        };
      },
    };
  }),
}));

const route = await import("@/app/api/health/route");

describe("public health route", () => {
  it("returns 200 ok when required service check succeeds", async () => {
    state.shouldThrow = false;
    state.shouldReturnError = false;

    const response = await route.GET();
    const payload = (await response.json()) as { status: string };

    expect(response.status).toBe(200);
    expect(payload).toEqual({ status: "ok" });
  });

  it("returns 503 degraded when required service check fails", async () => {
    state.shouldThrow = false;
    state.shouldReturnError = true;

    const response = await route.GET();
    const payload = (await response.json()) as { status: string };

    expect(response.status).toBe(503);
    expect(payload).toEqual({ status: "degraded" });
  });

  it("returns 503 degraded when unexpected error occurs", async () => {
    state.shouldThrow = true;
    state.shouldReturnError = false;

    const response = await route.GET();
    const payload = (await response.json()) as { status: string };

    expect(response.status).toBe(503);
    expect(payload).toEqual({ status: "degraded" });
  });
});
