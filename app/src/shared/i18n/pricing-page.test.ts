import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const pricingHtml = readFileSync(resolve(process.cwd(), "..", "pricing.html"), "utf8");

describe("public German pricing page", () => {
  it("shows only the 299 € net monthly price without setup fee", () => {
    expect(pricingHtml).toContain("299 € netto / Monat");
    expect(pricingHtml).toContain("Keine Einrichtungsgebühr");
    expect(pricingHtml).toContain("30 Tage kostenlos");
    expect(pricingHtml.match(/class="price"/g)).toHaveLength(1);
    expect(pricingHtml).not.toMatch(/\b(49|79|119)\s?€/);
  });
});
