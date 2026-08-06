import { describe, expect, it } from "vitest";

import { buildRateLimitedResponse } from "@/shared/lib/rate-limit/response";

describe("buildRateLimitedResponse", () => {
  it("returns 429 with Retry-After header", async () => {
    const response = buildRateLimitedResponse("Too many requests", 45);

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("45");
    expect(await response.text()).toBe("Too many requests");
  });

  it("falls back to safe retry-after value", () => {
    const response = buildRateLimitedResponse("Too many requests", -1);

    expect(response.headers.get("retry-after")).toBe("60");
  });
});
