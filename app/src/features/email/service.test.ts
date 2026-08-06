import { describe, expect, it } from "vitest";

import { composeTransactionalEmail } from "./service";

describe("composeTransactionalEmail", () => {
  it("renders a German owner notification with varnito.de links", () => {
    const email = composeTransactionalEmail(
      "new_inquiry",
      {
        lead_email: "kunde@example.com",
        lead_inquiry_type: "Dachreparatur",
        lead_message: "Bitte melden Sie sich.",
        lead_name: "Max Mustermann",
        lead_phone: "0123456789",
      },
      {
        companyName: "Musterbetrieb",
        signature: "Musterbetrieb Team",
        primaryColor: "#0f766e",
      },
    );

    expect(email.subject).toContain("Neue Anfrage fuer Musterbetrieb");
    expect(email.textContent).toContain("Max Mustermann");
    expect(email.textContent).toContain("https://varnito.de/dashboard");
    expect(email.htmlContent).toContain("https://varnito.de/dashboard");
  });

  it("falls back to Varnito branding when no company branding exists", () => {
    const email = composeTransactionalEmail("trial_started", { name: "Almir" });

    expect(email.subject).toContain("Varnito");
    expect(email.textContent).toContain("https://varnito.de/dashboard");
    expect(email.htmlContent).toContain("Varnito");
  });

  it("renders text and html fallback consistently", () => {
    const email = composeTransactionalEmail(
      "customer_confirmation",
      {
        lead_name: "Laura Beispiel",
      },
      {
        companyName: "Handwerk GmbH",
        signature: "Handwerk GmbH",
      },
    );

    expect(email.subject).toBe("Ihre Anfrage bei Handwerk GmbH ist eingegangen");
    expect(email.textContent).toContain("Laura Beispiel");
    expect(email.htmlContent).toContain("Laura Beispiel");
  });

  it("renders US email templates with varnito.com links", () => {
    const email = composeTransactionalEmail(
      "trial_started",
      { name: "Alex" },
      {
        companyName: "Service Pros LLC",
      },
      { market: "us" },
    );

    expect(email.subject).toBe("Your Varnito trial has started");
    expect(email.textContent).toContain("https://varnito.com/dashboard");
    expect(email.htmlContent).toContain("https://varnito.com/dashboard");
    expect(email.textContent).not.toContain("https://varnito.de");
  });
});
