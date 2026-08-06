import { describe, expect, it } from "vitest";

import { resolveGuideResponse } from "@/features/demo/guide";

describe("resolveGuideResponse", () => {
  it("returns german lead response and route", () => {
    const result = resolveGuideResponse("de", "Wie funktioniert die Lead-Verwaltung?");

    expect(result.answer).toContain("Leads");
    expect(result.route).toBe("/demo/leads");
    expect(result.constrained).toBe(true);
  });

  it("returns english billing response and route", () => {
    const result = resolveGuideResponse("us", "How does the free trial work?");

    expect(result.answer).toContain("Billing");
    expect(result.route).toBe("/demo/billing");
    expect(result.constrained).toBe(true);
  });

  it("returns safety answer for unrelated question", () => {
    const deResult = resolveGuideResponse("de", "Wie wird das Wetter morgen?");
    const usResult = resolveGuideResponse("us", "Who won the world cup?");

    expect(deResult.answer).toBe("Ich helfe Ihnen ausschliesslich dabei, Varnito kennenzulernen.");
    expect(usResult.answer).toBe("I can only help you explore Varnito.");
    expect(deResult.route).toBeUndefined();
    expect(usResult.route).toBeUndefined();
  });
});
