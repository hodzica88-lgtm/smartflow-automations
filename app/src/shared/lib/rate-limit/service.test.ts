import { describe, expect, it } from "vitest";

import { buildRateLimitedResponse } from "@/shared/lib/rate-limit/response";

describe("buildRateLimitedResponse", () => {
  it("returns 429 with Retry-After header", async () => {
    const response = buildRateLimitedResponse("Too many requests", 45);
    const payload = (await response.json()) as {
      ok: boolean;
      error: { code: string; message: string; eventId: string };
    };

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("45");
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("RATE_LIMITED");
    expect(payload.error.message).toBe("Too many requests");
    expect(payload.error.eventId.length).toBeGreaterThan(8);
  });

  it("falls back to safe retry-after value", () => {
    const response = buildRateLimitedResponse("Too many requests", -1);

    expect(response.headers.get("retry-after")).toBe("60");
  });
});
