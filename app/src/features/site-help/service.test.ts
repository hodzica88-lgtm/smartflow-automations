import { describe, expect, it, vi } from "vitest";

import {
  findSiteHelpAnswer,
  sanitizeSiteHelpInput,
} from "@/features/site-help/service";

describe("site help assistant", () => {
  it("routes registration and sign-up questions to the public signup flow", () => {
    const result = findSiteHelpAnswer({
      market: "de",
      message: "Ich möchte mich registrieren und den Testzugang starten.",
      path: "/",
    });

    expect(result.answer).toContain("Registrierung");
    expect(result.action.type).toBe("route");
    expect(result.action.href).toBe("/registrierung");
  });

  it("handles legal navigation requests for both markets", () => {
    const deResult = findSiteHelpAnswer({
      market: "de",
      message: "Wo finde ich Datenschutz und AGB?",
      path: "/",
    });
    const usResult = findSiteHelpAnswer({
      market: "us",
      message: "Where are the legal pages?",
      path: "/demo",
    });

    expect(deResult.action.href).toBe("/datenschutz");
    expect(usResult.action.href).toBe("/datenschutz");
    expect(usResult.answer).toContain("Privacy");
  });

  it("uses the direct support mailto action in German", () => {
    const result = findSiteHelpAnswer({
      market: "de",
      message: "Ich brauche Hilfe und möchte Support kontaktieren.",
      path: "/",
    });

    expect(result.action.href).toBe("mailto:support@varnito.com");
    expect(result.action.label).toBe("Support kontaktieren");
  });

  it("uses the direct support mailto action in English", () => {
    const result = findSiteHelpAnswer({
      market: "us",
      message: "I need support and want to contact support.",
      path: "/",
    });

    expect(result.action.href).toBe("mailto:support@varnito.com");
    expect(result.action.label).toBe("Contact support");
  });

  it("uses the German problem-report subject for customer mailto actions", () => {
    const result = findSiteHelpAnswer({
      market: "de",
      message: "Ich möchte ein Problem melden.",
      path: "/",
    });

    expect(result.action.href).toBe("mailto:support@varnito.com?subject=Varnito%20%E2%80%93%20Problem%20melden");
    expect(result.action.label).toBe("Problem melden");
  });

  it("uses the English problem-report subject for customer mailto actions", () => {
    const result = findSiteHelpAnswer({
      market: "us",
      message: "I want to report a problem.",
      path: "/",
    });

    expect(result.action.href).toBe("mailto:support@varnito.com?subject=Varnito%20%E2%80%93%20Report%20a%20problem");
    expect(result.action.label).toBe("Report a problem");
  });

  it("removes personal contact details before sending a user message to AI", () => {
    const sanitized = sanitizeSiteHelpInput(
      "My email is max@example.com and I want to find the pricing page.",
    );

    expect(sanitized).not.toContain("max@example.com");
    expect(sanitized).toContain("pricing");
    expect(sanitized).not.toContain("email");
  });

  it("does not call the helper when the site-help request is rate-limited", async () => {
    const mockEnforce = vi.fn(async () => ({ allowed: false, retryAfterSeconds: 30 }));
    const mockAnswer = vi.fn(async () => ({
      answer: "this should not run",
      action: { type: "route", href: "/" },
      method: "deterministic",
      confidence: 0.8,
    }));

    const { POST } = await import("@/app/api/public/site-help/route");
    const rateLimitModule = await import("@/shared/lib/rate-limit/service");

    vi.spyOn(rateLimitModule, "enforceActionRateLimit").mockImplementation(mockEnforce as never);
    vi.spyOn(await import("@/features/site-help/service"), "answerSiteHelpRequest").mockImplementation(mockAnswer as never);

    const response = await POST(new Request("http://localhost/api/public/site-help", {
      method: "POST",
      body: JSON.stringify({ message: "I need help" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(429);
    expect(mockEnforce).toHaveBeenCalledWith({
      scope: "site_help_public",
      maxSubmissions: 20,
      windowMinutes: 10,
    });
    expect(mockAnswer).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
