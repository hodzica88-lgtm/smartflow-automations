import { describe, expect, it, vi } from "vitest";

import {
  enforcePublicSuggestionRateLimit,
  getContactDetailsFields,
  getContactDetailsQuestion,
  inferInquiryTypeSuggestion,
  MAX_PUBLIC_INQUIRY_DESCRIPTION_LENGTH,
  maybeRecordRateLimit,
  validateContactDetailsInput,
  validatePublicInquiryActionRequest,
  validatePublicInquiryInput,
} from "@/features/inquiry-assistant/service";
import {
  buildContextualFollowUpQuestion,
  buildInquirySummary,
  combineInquiryDescription,
  getInquiryTypeDisplayLabel,
  getSubmissionSuccessText,
  resolveInquiryTypeOption,
} from "@/features/inquiry-assistant/summary";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.7" })),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => ({
    rpc: vi.fn(async () => ({ error: new Error("db rate limit unavailable"), data: null })),
  }),
}));

describe("inquiry assistant service", () => {
  it("fails closed when the rate-limit backend is unavailable", async () => {
    const result = await enforcePublicSuggestionRateLimit({ companyId: "company-123" });
    expect(result.allowed).toBe(false);
  });

  it("allows preview requests when the backend says yes and blocks them when it says no", async () => {
    const allowedSupabase = {
      rpc: vi.fn(async () => ({ data: [{ allowed: true }], error: null })),
    };
    const blockedSupabase = {
      rpc: vi.fn(async () => ({ data: [{ allowed: false }], error: null })),
    };

    await expect(
      maybeRecordRateLimit({
        supabase: allowedSupabase as unknown as Parameters<typeof maybeRecordRateLimit>[0]["supabase"],
        companyId: "company-123",
        clientIp: "203.0.113.7",
        bucket: "public_ai_chat_preview",
      }),
    ).resolves.toEqual({ allowed: true });

    await expect(
      maybeRecordRateLimit({
        supabase: blockedSupabase as unknown as Parameters<typeof maybeRecordRateLimit>[0]["supabase"],
        companyId: "company-123",
        clientIp: "203.0.113.7",
        bucket: "public_ai_chat_preview",
      }),
    ).resolves.toEqual({ allowed: false });
  });

  it("uses a separate rate-limit bucket for preview suggestions and final submissions", async () => {
    const previewSupabase = {
      rpc: vi.fn(async () => ({ data: [{ allowed: true }], error: null })),
    };
    const submitSupabase = {
      rpc: vi.fn(async () => ({ data: [{ allowed: true }], error: null })),
    };

    await maybeRecordRateLimit({
      supabase: previewSupabase as unknown as Parameters<typeof maybeRecordRateLimit>[0]["supabase"],
      companyId: "company-123",
      clientIp: "203.0.113.7",
      bucket: "public_ai_chat_preview",
    });

    await maybeRecordRateLimit({
      supabase: submitSupabase as unknown as Parameters<typeof maybeRecordRateLimit>[0]["supabase"],
      companyId: "company-123",
      clientIp: "203.0.113.7",
      bucket: "public_ai_chat_submit",
    });

    expect(previewSupabase.rpc).toHaveBeenCalledWith(
      "check_and_record_inquiry_chat_rate_limit",
      expect.objectContaining({
        p_company_id: "company-123",
        p_client_ip: "203.0.113.7",
        p_max_submissions: 15,
        p_window_minutes: 30,
      }),
    );

    expect(submitSupabase.rpc).toHaveBeenCalledWith(
      "check_and_record_inquiry_rate_limit",
      expect.objectContaining({
        p_company_id: "company-123",
        p_client_ip: "203.0.113.7",
        p_max_submissions: 5,
        p_window_minutes: 10,
      }),
    );
  });

  it("rejects oversized descriptions and invalid route payloads before the AI call", () => {
    const oversizedDescription = validatePublicInquiryActionRequest({
      action: "suggest-type",
      companyId: "company-123",
      description: "x".repeat(MAX_PUBLIC_INQUIRY_DESCRIPTION_LENGTH + 1),
    });
    const invalidAction = validatePublicInquiryActionRequest({
      action: "pwned",
      companyId: "company-123",
      description: "Heizung kaputt",
    });
    const invalidCompany = validatePublicInquiryActionRequest({
      action: "suggest-type",
      companyId: "bad company",
      description: "Heizung kaputt",
    });

    expect(oversizedDescription.ok).toBe(false);
    if (!oversizedDescription.ok) {
      expect(oversizedDescription.status).toBe(413);
    }

    expect(invalidAction.ok).toBe(false);
    if (!invalidAction.ok) {
      expect(invalidAction.status).toBe(400);
    }

    expect(invalidCompany.ok).toBe(false);
    if (!invalidCompany.ok) {
      expect(invalidCompany.status).toBe(400);
    }
  });

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

  it("never calls the OpenAI API for the public inquiry classification and works without a key", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const previousApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const result = await inferInquiryTypeSuggestion({
      description: "Meine Heizung funktioniert nicht.",
      allowedInquiryTypes: ["Heizungsreparatur", "Allgemeine Anfrage"],
      market: "de",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.method).toBe("deterministic");
    expect(result.suggestedInquiryType).toBe("Heizungsreparatur");

    fetchSpy.mockRestore();
    if (previousApiKey) {
      process.env.OPENAI_API_KEY = previousApiKey;
    }
  });

  it("keeps the deterministic selection within the allowed inquiry-type list when no AI route exists", async () => {
    const result = await inferInquiryTypeSuggestion({
      description: "Meine Heizung funktioniert nicht.",
      allowedInquiryTypes: ["Heizungsreparatur", "Allgemeine Anfrage"],
      market: "de",
    });

    expect(result.suggestedInquiryType).toBe("Heizungsreparatur");
    expect(result.requiresTypeSelection).toBe(false);
    expect(result.options).toEqual([]);
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

  it("keeps DE labels in German and localizes built-in US inquiry types without changing canonical values", () => {
    expect(getInquiryTypeDisplayLabel("Angebot anfordern", "de")).toBe("Angebot anfordern");
    expect(getInquiryTypeDisplayLabel("Angebot anfordern", "us")).toBe("Request a quote");
    expect(getInquiryTypeDisplayLabel("Beratung", "us")).toBe("Consultation");
    expect(getInquiryTypeDisplayLabel("Rückrufbitte", "us")).toBe("Request a callback");
    expect(getInquiryTypeDisplayLabel("Terminwunsch", "us")).toBe("Request an appointment");
    expect(getInquiryTypeDisplayLabel("Reklamation", "us")).toBe("Complaint");
    expect(getInquiryTypeDisplayLabel("General inquiry", "us")).toBe("General inquiry");
    expect(getInquiryTypeDisplayLabel("Custom request type", "us")).toBe("Custom request type");

    const resolution = resolveInquiryTypeOption("Request a quote", ["Angebot anfordern", "Beratung", "Rückrufbitte"], "Allgemeine Anfrage");
    expect(resolution).toBe("Angebot anfordern");
    expect(getInquiryTypeDisplayLabel(resolution, "us")).toBe("Request a quote");
  });

  it("uses English summary labels for US customer-facing request types while keeping canonical stored values", () => {
    const summary = buildInquirySummary({
      firstName: "Jane",
      lastName: "Doe",
      address: "123 Main St",
      phone: "+1 555 123 4567",
      email: "jane@example.com",
      inquiryType: "Angebot anfordern",
      description: "My heating stopped working this morning.",
      contextualAnswer: "The radiator stays cold.",
      market: "us",
      allowedInquiryTypes: ["Angebot anfordern", "Beratung", "Rückrufbitte", "Terminwunsch"],
    });

    expect(summary).toContain("Request type:");
    expect(summary).toContain("Request a quote");
    expect(summary).not.toContain("Angebot anfordern");
  });

  it("keeps the visible user chat bubble localized in US while preserving canonical values internally", () => {
    const visibleLabel = getInquiryTypeDisplayLabel("Angebot anfordern", "us");
    const storedCanonicalValue = "Angebot anfordern";

    expect(visibleLabel).toBe("Request a quote");
    expect(storedCanonicalValue).toBe("Angebot anfordern");
    expect(getInquiryTypeDisplayLabel("Angebot anfordern", "de")).toBe("Angebot anfordern");
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
