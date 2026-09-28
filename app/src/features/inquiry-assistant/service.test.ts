import { describe, expect, it } from "vitest";

import {
  getContactDetailsFields,
  getContactDetailsQuestion,
  inferInquiryTypeSuggestion,
  validateContactDetailsInput,
  validatePublicInquiryInput,
} from "@/features/inquiry-assistant/service";
import {
  buildContextualFollowUpQuestion,
  buildInquirySummary,
  combineInquiryDescription,
  getSubmissionSuccessText,
  resolveInquiryTypeOption,
} from "@/features/inquiry-assistant/summary";

describe("inquiry assistant service", () => {
  it("infers the right German inquiry type from a heating problem", async () => {
    const result = await inferInquiryTypeSuggestion({
      description: "Meine Heizung funktioniert seit heute Morgen nicht mehr.",
      allowedInquiryTypes: ["Heizungsreparatur", "Klimaanlage", "Allgemeine Anfrage"],
      market: "de",
    });

    expect(result.suggestedInquiryType).toBe("Heizungsreparatur");
    expect(result.summary).toContain("Heizung");
  });

  it("infers the right English inquiry type from an AC problem", async () => {
    const result = await inferInquiryTypeSuggestion({
      description: "My AC stopped working this morning.",
      allowedInquiryTypes: ["AC Repair", "General Inquiry", "Heating Service"],
      market: "us",
    });

    expect(result.suggestedInquiryType).toBe("AC Repair");
  });

  it("uses the contextual heating question even when AI returns a generic prompt", async () => {
    const result = await inferInquiryTypeSuggestion({
      description: "Meine Heizung funktioniert seit heute Morgen nicht mehr.",
      allowedInquiryTypes: ["Heizungsreparatur", "Klimaanlage", "Allgemeine Anfrage"],
      market: "de",
    });

    expect(result.suggestedInquiryType).toBe("Heizungsreparatur");
    expect(result.requiresTypeSelection).toBe(false);
    expect(result.question).toContain("nicht funktioniert");
    expect(result.question).not.toContain("Welche Anfrageart");
  });

  it("auto-selects the only available inquiry type without asking the category question", async () => {
    const result = await inferInquiryTypeSuggestion({
      description: "Meine Heizung funktioniert seit heute Morgen nicht mehr.",
      allowedInquiryTypes: ["Heizungsreparatur"],
      market: "de",
    });

    expect(result.suggestedInquiryType).toBe("Heizungsreparatur");
    expect(result.requiresTypeSelection).toBe(false);
    expect(result.question).not.toContain("Welche Anfrageart");
    expect(result.question).toContain("nicht funktioniert");
  });

  it("asks for a category choice only when multiple types are genuinely ambiguous", async () => {
    const clearResult = await inferInquiryTypeSuggestion({
      description: "Meine Heizung funktioniert seit heute Morgen nicht mehr.",
      allowedInquiryTypes: ["Heizungsreparatur", "Klimaanlage", "Allgemeine Anfrage"],
      market: "de",
    });
    const ambiguousResult = await inferInquiryTypeSuggestion({
      description: "Ich brauche Hilfe mit meinem Haus.",
      allowedInquiryTypes: ["Heizungsreparatur", "Klimaanlage", "Allgemeine Anfrage"],
      market: "de",
    });

    expect(clearResult.requiresTypeSelection).toBe(false);
    expect(clearResult.question).toContain("nicht funktioniert");
    expect(ambiguousResult.requiresTypeSelection).toBe(true);
    expect(ambiguousResult.question).toContain("Welche Art von Anfrage möchten Sie senden?");
  });

  it("rejects a malicious inquiry type that is not in the active tenant list", () => {
    const result = validatePublicInquiryInput({
      companyId: "company-123",
      firstName: "Max",
      lastName: "Mustermann",
      address: "Musterstraße 1, Stuttgart",
      phone: "+49 711 123456",
      email: "max@example.com",
      inquiryType: "<script>alert(1)</script>",
      description: "Heizung kaputt",
      allowedInquiryTypes: ["Heizungsreparatur"],
      source: "public_ai_chat",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Anfrageart");
    }
  });

  it("requires all mandatory lead fields before accepting the submission", () => {
    const result = validatePublicInquiryInput({
      companyId: "company-123",
      firstName: "Max",
      lastName: "",
      address: "Musterstraße 1",
      phone: "",
      email: "max@example.com",
      inquiryType: "Heizungsreparatur",
      description: "Heizung defekt",
      allowedInquiryTypes: ["Heizungsreparatur"],
      source: "public_ai_chat",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Pflichtfelder");
    }
  });

  it("uses a single contact-details step after the follow-up and shows all five fields together", () => {
    const deQuestion = getContactDetailsQuestion("de");
    const usQuestion = getContactDetailsQuestion("us");
    const deFields = getContactDetailsFields("de");
    const usFields = getContactDetailsFields("us");

    expect(deQuestion).toBe("Danke. Bitte geben Sie uns noch Ihre Kontaktdaten, damit der Betrieb Sie erreichen kann.");
    expect(usQuestion).toBe("Thanks. Please provide your contact details so the business can reach you.");
    expect(deFields.map((field) => field.label)).toEqual([
      "Vorname",
      "Nachname",
      "Adresse",
      "Telefonnummer",
      "E-Mail-Adresse",
    ]);
    expect(usFields.map((field) => field.label)).toEqual([
      "First name",
      "Last name",
      "Address",
      "Phone number",
      "Email address",
    ]);
    expect(deFields).toHaveLength(5);
    expect(usFields).toHaveLength(5);
  });

  it("rejects invalid email and phone before summary", () => {
    const invalidEmail = validateContactDetailsInput({
      firstName: "Max",
      lastName: "Mustermann",
      address: "Musterstraße 1",
      phone: "+49 711 123456",
      email: "max@",
      market: "de",
    });
    const invalidPhone = validateContactDetailsInput({
      firstName: "Max",
      lastName: "Mustermann",
      address: "Musterstraße 1",
      phone: "invalid",
      email: "max@example.com",
      market: "de",
    });

    expect(invalidEmail.ok).toBe(false);
    if (!invalidEmail.ok) {
      expect(invalidEmail.error).toBe("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
    }
    expect(invalidPhone.ok).toBe(false);
    if (!invalidPhone.ok) {
      expect(invalidPhone.error).toBe("Bitte geben Sie eine gültige Telefonnummer ein.");
    }
  });

  it("accepts valid contact details and proceeds directly to summary", () => {
    const result = validateContactDetailsInput({
      firstName: "Max",
      lastName: "Mustermann",
      address: "Musterstraße 1, Stuttgart",
      phone: "+49 711 123456",
      email: "max@example.com",
      market: "de",
    });

    expect(result.ok).toBe(true);
  });

  it("never stores arbitrary free text as inquiryType", () => {
    const allowed = ["Heizungsreparatur", "Klimaanlage", "Allgemeine Anfrage"];
    const resolved = resolveInquiryTypeOption("Die Heizkörper bleiben komplett kalt.", allowed, "Allgemeine Anfrage");

    expect(allowed).toContain(resolved);
    expect(resolved).not.toBe("Die Heizkörper bleiben komplett kalt.");
  });

  it("keeps contextual follow-up answers separate from the inquiry type and stores the combined issue text for submission", () => {
    const combined = combineInquiryDescription(
      "Meine Heizung funktioniert seit heute Morgen nicht mehr.",
      "Die Heizkörper bleiben komplett kalt.",
    );

    expect(combined).toContain("Meine Heizung funktioniert seit heute Morgen nicht mehr.");
    expect(combined).toContain("Die Heizkörper bleiben komplett kalt.");

    const summary = buildInquirySummary({
      firstName: "Max",
      lastName: "Müller",
      address: "Hauptstraße 1",
      phone: "+49 176 1234567",
      email: "max@example.com",
      inquiryType: "Heizungsreparatur",
      description: "Meine Heizung funktioniert seit heute Morgen nicht mehr.",
      contextualAnswer: "Die Heizkörper bleiben komplett kalt.",
      market: "de",
      allowedInquiryTypes: ["Heizungsreparatur", "Klimaanlage", "Allgemeine Anfrage"],
    });

    expect(summary).toContain("Heizungsreparatur");
    expect(summary).toContain("Die Heizkörper bleiben komplett kalt.");
    expect(summary).toContain("Anfrageart:\nHeizungsreparatur");
    expect(summary).not.toContain("Anfrageart:\nDie Heizkörper bleiben komplett kalt.");
  });

  it("builds a complete customer summary with all relevant details before final submission", () => {
    const summary = buildInquirySummary({
      firstName: "Max",
      lastName: "Müller",
      address: "Hauptstraße 1",
      phone: "+49 176 1234567",
      email: "max@example.com",
      inquiryType: "Allgemeine Anfrage",
      description: "Meine Heizung funktioniert seit heute Morgen nicht mehr.",
      contextualAnswer: "Die Heizkörper bleiben komplett kalt.",
      market: "de",
      allowedInquiryTypes: ["Heizungsreparatur", "Klimaanlage", "Allgemeine Anfrage"],
    });

    expect(summary).toContain("Anliegen");
    expect(summary).toContain("Meine Heizung funktioniert");
    expect(summary).toContain("Die Heizkörper bleiben komplett kalt");
    expect(summary).toContain("Max Müller");
    expect(summary).toContain("Hauptstraße 1");
    expect(summary).toContain("+49 176");
    expect(summary).toContain("max@example.com");
    expect(summary).not.toContain("Allgemeine Anfrage");
  });

  it("keeps the heating contextual follow-up after a manual type-selection step", () => {
    const originalDescription = "Meine Heizung funktioniert seit heute Morgen nicht mehr.";
    const followUp = buildContextualFollowUpQuestion({ description: originalDescription, market: "de" });

    expect(followUp).toContain("Heizung");
    expect(followUp).toContain("Fehlermeldung");
    expect(followUp).not.toContain("Welche Art von Anfrage");
  });

  it("uses the final DE and US success copy exactly once for the terminal success state", () => {
    expect(getSubmissionSuccessText("de")).toBe("Vielen Dank! Ihre Anfrage wurde erfolgreich gesendet.");
    expect(getSubmissionSuccessText("us")).toBe("Thanks! Your request has been sent successfully.");
  });

  it("uses deterministic type selection copy for ambiguous multi-type flow and allows only valid option values", async () => {
    const result = await inferInquiryTypeSuggestion({
      description: "Ich brauche Hilfe mit meinem Haus.",
      allowedInquiryTypes: ["Heizungsreparatur", "Klimaanlage", "Allgemeine Anfrage"],
      market: "de",
    });

    expect(result.requiresTypeSelection).toBe(true);
    expect(result.question).toBe("Welche Art von Anfrage möchten Sie senden?");
    expect(result.options.every((option) => ["Heizungsreparatur", "Klimaanlage", "Allgemeine Anfrage"].includes(option))).toBe(true);
  });
});
