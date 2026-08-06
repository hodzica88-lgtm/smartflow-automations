import { describe, expect, it } from "vitest";

import { getMarketCopy } from "@/shared/i18n/copy";

describe("market copy", () => {
  it("contains natural US landing pricing and CTA copy", () => {
    const us = getMarketCopy("us").landing;

    expect(us.heroTitle).toBe("Never lose another lead.");
    expect(us.pricingTitle).toBe("Varnito Pro monthly subscription.");
    expect(us.pricingValue).toBe("Price is loaded at checkout");
    expect(us.primaryCta).toBe("Start your 30-day free trial");
  });

  it("keeps germany landing pricing and CTA copy", () => {
    const de = getMarketCopy("de").landing;

    expect(de.pricingTitle).toBe("Varnito Pro Monatsabo.");
    expect(de.pricingValue).toBe("Preis wird im Checkout geladen");
    expect(de.primaryCta).toBe("30 Tage kostenlos testen");
  });
});
