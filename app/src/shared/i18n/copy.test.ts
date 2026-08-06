import { describe, expect, it } from "vitest";

import { getMarketCopy } from "@/shared/i18n/copy";

describe("market copy", () => {
  it("contains natural US landing pricing and CTA copy", () => {
    const us = getMarketCopy("us").landing;

    expect(us.heroTitle).toBe("Never lose another lead.");
    expect(us.pricingValue).toBe("299 USD / month");
    expect(us.primaryCta).toBe("Start your 30-day free trial");
  });

  it("keeps germany landing pricing and CTA copy", () => {
    const de = getMarketCopy("de").landing;

    expect(de.pricingValue).toBe("299 EUR / Monat");
    expect(de.primaryCta).toBe("30 Tage kostenlos testen");
  });
});
