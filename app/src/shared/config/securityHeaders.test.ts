import { describe, expect, it } from "vitest";

import { SECURITY_HEADERS_BY_KEY } from "@/shared/config/securityHeaders";

describe("SECURITY_HEADERS", () => {
  it("contains baseline hardening headers", () => {
    expect(SECURITY_HEADERS_BY_KEY.get("x-content-type-options")).toBe("nosniff");
    expect(SECURITY_HEADERS_BY_KEY.get("x-frame-options")).toBe("DENY");
    expect(SECURITY_HEADERS_BY_KEY.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(SECURITY_HEADERS_BY_KEY.get("permissions-policy")).toContain("camera=()");
    expect(SECURITY_HEADERS_BY_KEY.get("strict-transport-security")).toContain("max-age");
  });
});
