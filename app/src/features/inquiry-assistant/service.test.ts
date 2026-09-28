import { describe, expect, it } from "vitest";

import {
  buildInquirySummary,
  inferInquiryTypeSuggestion,
  validatePublicInquiryInput,
} from "@/features/inquiry-assistant/service";

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
    expect(ambiguousResult.question).toContain("Welche Anfrageart");
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

  it("builds a concise customer summary for final confirmation", () => {
    const summary = buildInquirySummary({
      firstName: "Max",
      lastName: "Mustermann",
      address: "Musterstraße 1, Stuttgart",
      inquiryType: "Heizungsreparatur",
      description: "Heizung funktioniert seit heute Morgen nicht mehr.",
      market: "de",
    });

    expect(summary).toContain("Heizungsreparatur");
    expect(summary).toContain("Max Mustermann");
  });
});
