import { describe, expect, it } from "vitest";

import {
  isValidRegistrationEmail,
  isValidRegistrationPassword,
  normalizeRegistrationEmail,
  resolveAuthRedirectBase,
  sanitizeRegistrationSource,
} from "./registration";

describe("registration helpers", () => {
  it("normalizes and validates emails", () => {
    expect(normalizeRegistrationEmail("  A@B.de ")).toBe("a@b.de");
    expect(isValidRegistrationEmail("a@b.de")).toBe(true);
    expect(isValidRegistrationEmail("a@b")).toBe(false);
    expect(isValidRegistrationEmail("a b@c.de")).toBe(false);
    expect(isValidRegistrationEmail(`${"a".repeat(250)}@b.de`)).toBe(false);
  });

  it("validates passwords", () => {
    expect(isValidRegistrationPassword("geheim12345")).toBe(true);
    expect(isValidRegistrationPassword("kurz1")).toBe(false);
    expect(isValidRegistrationPassword("nurbuchstaben")).toBe(false);
    expect(isValidRegistrationPassword("12345678901")).toBe(false);
    expect(isValidRegistrationPassword(`a1${"x".repeat(80)}`)).toBe(false);
  });

  it("only passes safe source tokens", () => {
    expect(sanitizeRegistrationSource("google_ads")).toBe("google_ads");
    expect(sanitizeRegistrationSource("a&b=c")).toBe("");
    expect(sanitizeRegistrationSource(null)).toBe("");
  });

  it("uses the market site URL except on local hosts", () => {
    expect(resolveAuthRedirectBase("evil.example", "https://varnito.de")).toBe("https://varnito.de");
    expect(resolveAuthRedirectBase("localhost:3000", "https://varnito.de")).toBe("http://localhost:3000");
    expect(resolveAuthRedirectBase(null, "https://varnito.com")).toBe("https://varnito.com");
  });
});
