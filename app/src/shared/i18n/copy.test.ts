import { describe, expect, it } from "vitest";

import { getMarketCopy } from "@/shared/i18n/copy";

describe("market copy", () => {
  it("contains natural US landing pricing and CTA copy", () => {
    const us = getMarketCopy("us").landing;

    expect(us.heroTitle).toBe("Never lose another lead.");
    expect(us.pricingTitle).toBe("Varnito Pro monthly subscription.");
    expect(us.pricingValue).toBe("$399 / month");
    expect(us.pricingTaxNote).toBe("Taxes calculated at checkout where applicable.");
    expect(us.faq.some((entry) => entry.question === "Do prices include taxes?" && entry.answer.includes("Applicable taxes are calculated during checkout"))).toBe(true);
    expect(us.primaryCta).toBe("Start your 30-day free trial");
  });

  it("contains english US auth and contact copy", () => {
    const us = getMarketCopy("us").shared;

    expect(us.auth.registrationTitle).toBe("Start registration");
    expect(us.auth.registrationLead).toBe("Sign in to create your company and start the 30-day free trial.");
    expect(us.auth.registrationPrice).toBe("$399 / month");
    expect(us.auth.registrationTaxNote).toBe("Taxes calculated at checkout where applicable.");
    expect(us.auth.loginForgotPassword).toBe("Forgot your password?");
    expect(us.auth.forgotBackToLogin).toBe("Back to login");
    expect(us.contact.title).toBe("Contact us");
    expect(us.inquiryShare.title).toBe("Share inquiry form");
    expect(us.inquiryShare.linkDescription).toBe("Share this link by email, WhatsApp, or on your website.");
    expect(us.inquiryShare.embedDescription).toBe("Add this code to your website.");
    expect(us.inquiryShare.qrDescription).toBe("Print this QR code or use it on flyers and business cards.");
    expect(us.inquiryShare.embedTitle).toBe("Inquiry form");
  });

  it("keeps germany landing pricing and CTA copy", () => {
    const de = getMarketCopy("de").landing;

    expect(de.pricingTitle).toBe("Varnito Pro Monatsabo.");
    expect(de.pricingValue).toBe("299 € / Monat");
    expect(de.pricingTaxNote).toBe("zzgl. gesetzlicher Umsatzsteuer");
    expect(de.faq.some((entry) => entry.question === "Sind die Preise netto oder brutto?" && entry.answer.includes("zzgl. der gesetzlichen Umsatzsteuer"))).toBe(true);
    expect(de.primaryCta).toBe("30 Tage kostenlos testen");
  });

  it("keeps german auth and contact copy", () => {
    const de = getMarketCopy("de").shared;

    expect(de.auth.registrationTitle).toBe("Registrierung starten");
    expect(de.auth.registrationPrice).toBe("299 € / Monat");
    expect(de.auth.registrationTaxNote).toBe("zzgl. gesetzlicher Umsatzsteuer");
    expect(de.auth.loginForgotPassword).toBe("Passwort vergessen?");
    expect(de.auth.forgotBackToLogin).toBe("Zurück zur Anmeldung");
    expect(de.contact.title).toBe("Kontakt aufnehmen");
    expect(de.inquiryShare.title).toBe("Anfrageformular teilen");
    expect(de.inquiryShare.linkDescription).toBe("Diesen Link können Sie per E-Mail, WhatsApp oder auf Ihrer Website teilen.");
    expect(de.inquiryShare.embedDescription).toBe("Diesen Code können Sie in Ihre Website einfügen.");
    expect(de.inquiryShare.qrDescription).toBe("Diesen QR-Code können Sie ausdrucken oder auf Flyern und Visitenkarten verwenden.");
    expect(de.inquiryShare.embedTitle).toBe("Anfrageformular");
  });
});
