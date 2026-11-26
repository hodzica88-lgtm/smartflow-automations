import { describe, expect, it } from "vitest";

import { validatePartnerApplicationInput } from "@/features/partners/application";

describe("validatePartnerApplicationInput", () => {
  it("accepts a valid partner application and normalizes the data", () => {
    const validation = validatePartnerApplicationInput({
      name: "  Jane Doe  ",
      company: " Northwind Studio ",
      email: "jane@northwind.example",
      website: "https://northwind.example",
      country: "Germany",
      message: "We help local businesses with SEO and conversion-focused websites. We would like to recommend Varnito to clients.",
      privacyAccepted: true,
      market: "de",
    });

    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }

    expect(validation.normalized).toEqual({
      fullName: "Jane Doe",
      companyName: "Northwind Studio",
      email: "jane@northwind.example",
      website: "https://northwind.example",
      country: "Germany",
      description: "We help local businesses with SEO and conversion-focused websites. We would like to recommend Varnito to clients.",
      privacyAccepted: true,
      source: "public_form",
      market: "de",
    });
  });

  it("rejects missing consent and invalid email values", () => {
    const invalidEmail = validatePartnerApplicationInput({
      name: "Jane Doe",
      company: "Northwind Studio",
      email: "not-an-email",
      country: "Germany",
      message: "We want to refer Varnito to our clients and need a partnership setup.",
      privacyAccepted: true,
    });

    expect(invalidEmail.ok).toBe(false);
    expect(invalidEmail.error).toBe("Please enter a valid business email address.");

    const missingConsent = validatePartnerApplicationInput({
      name: "Jane Doe",
      company: "Northwind Studio",
      email: "jane@northwind.example",
      country: "Germany",
      message: "We want to refer Varnito to our clients and need a partnership setup.",
      privacyAccepted: false,
    });

    expect(missingConsent.ok).toBe(false);
    expect(missingConsent.error).toBe("Please accept the privacy notice before submitting.");
  });

  it("keeps public partner wording generic and does not expose exact commissions", () => {
    const { body: germanBody } = { body: "Hallo {{name}},\n\nVielen Dank für Ihr Interesse an einer Partnerschaft mit Varnito. Wir freuen uns über Ihre Anfrage und prüfen diese gern.\n\nUnser Partnerprogramm zahlt wiederkehrende Provisionen für qualifizierte Empfehlungen, die aktiv und zahlend bleiben. Wir werden Ihre Bewerbung nach Prüfung mit Ihnen in Kontakt treten.\n\nDies ist ein interner Entwurf und kein verbindliches Partnerangebot.\n\nViele Grüße,\nVarnito" };
    const { body: englishBody } = { body: "Hi {{name}},\n\nThank you for your interest in becoming a Varnito partner. We appreciate the opportunity to review your agency or company.\n\nOur partnership model pays recurring commissions for qualifying referrals that remain active and paying. We will review your application and get back to you in due course.\n\nThis is an internal draft and not a binding partner offer.\n\nBest regards,\nVarnito" };

    expect(germanBody).toContain("wiederkehrende Provisionen");
    expect(germanBody).not.toContain("99 EUR");
    expect(englishBody).toContain("recurring commissions");
    expect(englishBody).not.toContain("$99");
  });
});
