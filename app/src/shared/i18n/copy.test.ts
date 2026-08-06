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

  it("contains english US auth and contact copy", () => {
    const us = getMarketCopy("us").shared;

    expect(us.auth.registrationTitle).toBe("Start registration");
    expect(us.auth.registrationLead).toBe("Sign in to create your company and start the 30-day free trial.");
    expect(us.auth.loginForgotPassword).toBe("Forgot your password?");
    expect(us.auth.forgotBackToLogin).toBe("Back to login");
    expect(us.contact.title).toBe("Contact us");
  });

  it("keeps germany landing pricing and CTA copy", () => {
    const de = getMarketCopy("de").landing;

    expect(de.pricingTitle).toBe("Varnito Pro Monatsabo.");
    expect(de.pricingValue).toBe("Preis wird im Checkout geladen");
    expect(de.primaryCta).toBe("30 Tage kostenlos testen");
  });

  it("keeps german auth and contact copy", () => {
    const de = getMarketCopy("de").shared;

    expect(de.auth.registrationTitle).toBe("Registrierung starten");
    expect(de.auth.loginForgotPassword).toBe("Passwort vergessen?");
    expect(de.auth.forgotBackToLogin).toBe("Zurück zur Anmeldung");
    expect(de.contact.title).toBe("Kontakt aufnehmen");
  });
});
