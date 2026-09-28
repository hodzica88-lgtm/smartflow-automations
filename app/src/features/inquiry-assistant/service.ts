import { headers } from "next/headers";

import { trackAnalyticsEvent } from "@/features/analytics/events";
import { createAppNotification } from "@/features/notifications/service";
import { loadServerEnv } from "@/shared/config/env";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { getOwnerNotificationScheduledFor } from "@/shared/utils/businessHours";

export const FALLBACK_INQUIRY_TYPE = "Allgemeine Anfrage";

export type InquirySource = "public_ai_chat" | "public_form";
export type MarketCode = "de" | "us" | "unknown";

export type InquiryTypeSuggestion = {
  suggestedInquiryType: string;
  summary: string;
  question: string;
  options: string[];
  method: "deterministic" | "ai" | "fallback";
  confidence: number;
};

export type PublicInquiryInput = {
  companyId: string;
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  email: string;
  inquiryType: string;
  description?: string | null;
  website?: string | null;
  allowedInquiryTypes?: string[];
  source: InquirySource;
  turnCount?: number;
};

export type PublicInquiryValidationResult =
  | {
      ok: true;
      normalized: {
        firstName: string;
        lastName: string;
        address: string;
        phone: string;
        email: string;
        inquiryType: string;
        description: string | null;
      };
    }
  | {
      ok: false;
      error: string;
    };

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const normalizeInquiryTypeName = (value: string) =>
  normalizeWhitespace(value).replace(/[\u00A0]/g, " ");

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email.trim());

const isValidPhone = (phone: string) => {
  const normalized = phone.replace(/[^0-9+()\-\s]/g, "").trim();
  return normalized.length >= 7 && /\d/.test(normalized);
};

const makeAllowedInquiryTypeList = (allowedInquiryTypes?: string[]) => {
  const unique = new Set(
    (allowedInquiryTypes ?? [FALLBACK_INQUIRY_TYPE])
      .map((entry) => normalizeInquiryTypeName(entry))
      .filter(Boolean),
  );

  if (unique.size === 0) {
    return [FALLBACK_INQUIRY_TYPE];
  }

  return [...unique];
};

const resolveAllowedType = (candidate: string | null | undefined, allowedInquiryTypes: string[]) => {
  if (!candidate) {
    return null;
  }

  const normalizedCandidate = normalizeInquiryTypeName(candidate);
  if (!normalizedCandidate) {
    return null;
  }

  const directMatch = allowedInquiryTypes.find(
    (entry) => normalizeInquiryTypeName(entry) === normalizedCandidate,
  );

  if (directMatch) {
    return directMatch;
  }

  const caseInsensitiveMatch = allowedInquiryTypes.find(
    (entry) => normalizeInquiryTypeName(entry).toLowerCase() === normalizedCandidate.toLowerCase(),
  );

  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }

  return null;
};

export const buildInquirySummary = ({
  firstName,
  lastName,
  address,
  inquiryType,
  description,
  market,
}: {
  firstName: string;
  lastName: string;
  address: string;
  inquiryType: string;
  description?: string | null;
  market?: MarketCode | "unknown";
}) => {
  const name = `${firstName} ${lastName}`.trim();
  const german = market === "de" || market === "unknown";
  const summaryBits = [
    inquiryType,
    description && description.trim() ? description.trim() : german ? "Problembeschreibung" : "Issue summary",
    name || (german ? "Kunde" : "Customer"),
    address || (german ? "Adresse nicht angegeben" : "Address not provided"),
  ];

  const label = german ? "Ich habe:" : "I have:";
  return `${label} ${summaryBits.join(" • ")}`;
};

const getNormalizedLeadEmail = (value: string) => value.trim().toLowerCase();

export const validatePublicInquiryInput = ({
  companyId,
  firstName,
  lastName,
  address,
  phone,
  email,
  inquiryType,
  description,
  website,
  allowedInquiryTypes,
  source,
}: PublicInquiryInput): PublicInquiryValidationResult => {
  if (!companyId || companyId.trim().length === 0) {
    return { ok: false, error: "Ungültige Firma." };
  }

  if (website && website.trim().length > 0) {
    return { ok: false, error: "Anfrage konnte nicht gesendet werden." };
  }

  const normalizedAllowedInquiryTypes = makeAllowedInquiryTypeList(allowedInquiryTypes);
  const normalizedInquiryType = normalizeInquiryTypeName(inquiryType);
  const safeSource = source === "public_ai_chat" ? "public_ai_chat" : "public_form";

  if (!firstName || !lastName || !address || !phone || !email || !normalizedInquiryType) {
    return { ok: false, error: "Bitte alle Pflichtfelder ausfüllen." };
  }

  if (!isValidPhone(phone)) {
    return { ok: false, error: "Bitte gültige Telefonnummer angeben." };
  }

  if (!isValidEmail(email)) {
    return { ok: false, error: "Bitte gültige E-Mail-Adresse angeben." };
  }

  const resolvedInquiryType = resolveAllowedType(normalizedInquiryType, normalizedAllowedInquiryTypes);
  if (!resolvedInquiryType) {
    return { ok: false, error: "Bitte gültige Anfrageart auswählen." };
  }

  if (safeSource !== "public_ai_chat" && safeSource !== "public_form") {
    return { ok: false, error: "Anfrage konnte nicht gesendet werden." };
  }

  return {
    ok: true,
    normalized: {
      firstName: normalizeWhitespace(firstName),
      lastName: normalizeWhitespace(lastName),
      address: normalizeWhitespace(address),
      phone: normalizeWhitespace(phone),
      email: getNormalizedLeadEmail(email),
      inquiryType: resolvedInquiryType,
      description: description && description.trim().length > 0 ? normalizeWhitespace(description) : null,
    },
  };
};

const getClientIpForRateLimit = async () => {
  const requestHeaders = await headers();

  const prioritizedCandidates = [
    requestHeaders.get("cf-connecting-ip"),
    requestHeaders.get("x-real-ip"),
    requestHeaders.get("x-forwarded-for"),
  ];

  for (const candidate of prioritizedCandidates) {
    if (!candidate) {
      continue;
    }

    const first = candidate.split(",")[0]?.trim();
    if (!first) {
      continue;
    }

    if (first.length > 64 || !/^[0-9a-fA-F:.]+$/.test(first)) {
      continue;
    }

    return first;
  }

  if (process.env.NODE_ENV !== "production") {
    return "127.0.0.1";
  }

  return null;
};

const maybeRecordRateLimit = async ({
  supabase,
  companyId,
  clientIp,
  source,
}: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  companyId: string;
  clientIp: string;
  source: InquirySource;
}) => {
  const rpcName =
    source === "public_ai_chat"
      ? "check_and_record_inquiry_chat_rate_limit"
      : "check_and_record_inquiry_rate_limit";

  const { data, error } = await supabase.rpc(rpcName, {
    p_company_id: companyId,
    p_client_ip: clientIp,
    p_max_submissions: source === "public_ai_chat" ? 15 : 5,
    p_window_minutes: source === "public_ai_chat" ? 30 : 10,
  });

  if (error) {
    return { allowed: true } as const;
  }

  const allowed = Array.isArray(data) && data.length > 0 && Boolean((data[0] as { allowed?: unknown }).allowed);
  return { allowed } as const;
};

const getDeterministicSuggestion = ({
  description,
  allowedInquiryTypes,
  market,
}: {
  description: string;
  allowedInquiryTypes: string[];
  market?: MarketCode | "unknown";
}) => {
  const text = description.toLowerCase();
  const normalizedTypes = allowedInquiryTypes.map((entry) => ({
    original: entry,
    normalized: normalizeInquiryTypeName(entry).toLowerCase(),
  }));

  const germanMatcher = [
    { key: ["heizung", "heizungsreparatur", "heizungsanlage", "heizung reparatur"], matches: ["heizung", "heizungs"] },
    { key: ["klima", "klimaanlage", "ac", "air conditioning", "luftung"], matches: ["klima", "ac", "luftung", "air conditioning"] },
    { key: ["rohr", "wasser", "leitung", "sanitär", "sanitar"], matches: ["rohr", "wasser", "sanitär", "sanitar"] },
    { key: ["elektro", "strom", "steckdose", "installation"], matches: ["elektro", "strom", "steckdose", "installation"] },
    { key: ["dach", "reparatur", "abdichtung"], matches: ["dach", "abdichtung", "reparatur"] },
  ];

  const englishMatcher = [
    { key: ["ac", "air conditioning", "heating", "hvac"], matches: ["ac", "air conditioning", "heating", "hvac"] },
    { key: ["plumbing", "pipe", "water", "drain"], matches: ["plumbing", "pipe", "water", "drain"] },
    { key: ["electrical", "power", "outlet", "wiring"], matches: ["electrical", "power", "outlet", "wiring"] },
    { key: ["roof", "repair", "waterproofing"], matches: ["roof", "repair", "waterproofing"] },
  ];

  const matcherSet = market === "us" ? englishMatcher : germanMatcher;

  for (const set of matcherSet) {
    const keyMatches = set.key.some((key) => text.includes(key));
    if (!keyMatches) {
      continue;
    }

    const bestMatch = normalizedTypes.find(({ normalized }) =>
      set.matches.some((match) => normalized.includes(match)),
    );

    if (bestMatch) {
      return bestMatch.original;
    }
  }

  return allowedInquiryTypes[0] ?? FALLBACK_INQUIRY_TYPE;
};

const resolveAiInquiryType = (
  candidate: unknown,
  allowedInquiryTypes: string[],
): string | null => {
  if (typeof candidate !== "string") {
    return null;
  }

  const candidateValue = normalizeInquiryTypeName(candidate);
  if (!candidateValue) {
    return null;
  }

  const resolved = resolveAllowedType(candidateValue, allowedInquiryTypes);
  if (resolved) {
    return resolved;
  }

  const lower = candidateValue.toLowerCase();
  for (const allowedType of allowedInquiryTypes) {
    const normalizedAllowedType = normalizeInquiryTypeName(allowedType).toLowerCase();
    if (normalizedAllowedType.includes(lower) || lower.includes(normalizedAllowedType)) {
      return allowedType;
    }
  }

  return null;
};

export const inferInquiryTypeSuggestion = async ({
  description,
  allowedInquiryTypes,
  market,
}: {
  description: string;
  allowedInquiryTypes: string[];
  market?: MarketCode | "unknown";
}): Promise<InquiryTypeSuggestion> => {
  const safeAllowedInquiryTypes = makeAllowedInquiryTypeList(allowedInquiryTypes);
  const fallbackType = getDeterministicSuggestion({
    description,
    allowedInquiryTypes: safeAllowedInquiryTypes,
    market,
  });

  const openAiApiKey = loadServerEnv().openAiApiKey;
  const openAiModel = process.env.OPENAI_MODEL;

  if (openAiApiKey && openAiModel && description.trim().length > 0) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: openAiModel,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a safe intake assistant for a service business. You may only suggest an inquiry type from the provided allowedInquiryTypes list. Never invent services, prices, promises, or commitments. Output JSON with keys: suggestedInquiryType, summary, question, confidence.",
            },
            {
              role: "user",
              content: JSON.stringify({
                market: market ?? "de",
                description,
                allowedInquiryTypes: safeAllowedInquiryTypes,
              }),
            },
          ],
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = payload.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as {
            suggestedInquiryType?: unknown;
            summary?: unknown;
            question?: unknown;
            confidence?: unknown;
          };

          const suggestedInquiryType = resolveAiInquiryType(parsed.suggestedInquiryType, safeAllowedInquiryTypes) ?? fallbackType;
          const summary =
            typeof parsed.summary === "string" && parsed.summary.trim().length > 0
              ? parsed.summary.trim()
              : `${description.trim().slice(0, 120)}${description.length > 120 ? "…" : ""}`;
          const question =
            typeof parsed.question === "string" && parsed.question.trim().length > 0
              ? parsed.question.trim()
              : market === "us"
                ? "Which of these fits best?"
                : "Welche dieser Optionen passt am besten?";
          const confidence = typeof parsed.confidence === "number" ? Math.max(0.2, Math.min(0.99, parsed.confidence)) : 0.8;

          const options = safeAllowedInquiryTypes.filter((option) => option !== fallbackType)
            .slice(0, 3);

          return {
            suggestedInquiryType,
            summary,
            question,
            options: options.length > 0 ? [suggestedInquiryType, ...options] : [suggestedInquiryType],
            method: "ai",
            confidence,
          };
        }
      }
    } catch {
      // Safe fallback below.
    }
  }

  const summary = `${description.trim().slice(0, 120)}${description.length > 120 ? "…" : ""}`;
  const question = market === "us" ? "Which request type fits best?" : "Welche Anfrageart passt am besten?";
  return {
    suggestedInquiryType: fallbackType,
    summary,
    question,
    options: safeAllowedInquiryTypes.slice(0, 4),
    method: "deterministic",
    confidence: 0.75,
  };
};

export const createPublicInquiryLead = async ({
  companyId,
  firstName,
  lastName,
  address,
  phone,
  email,
  inquiryType,
  description,
  website,
  allowedInquiryTypes,
  source,
  turnCount,
}: PublicInquiryInput) => {
  const validation = validatePublicInquiryInput({
    companyId,
    firstName,
    lastName,
    address,
    phone,
    email,
    inquiryType,
    description,
    website,
    allowedInquiryTypes,
    source,
  });

  if (!validation.ok) {
    return { ok: false as const, error: validation.error };
  }

  const supabase = createSupabaseServiceRoleClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, deleted_at, timezone, business_hours")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !company || company.deleted_at) {
    return { ok: false as const, error: "Firma nicht gefunden." };
  }

  const clientIp = await getClientIpForRateLimit();
  if (!clientIp) {
    return { ok: false as const, error: "Anfrage konnte nicht gesendet werden." };
  }

  const rateLimit = await maybeRecordRateLimit({
    supabase,
    companyId,
    clientIp,
    source,
  });

  if (!rateLimit.allowed) {
    return {
      ok: false as const,
      error:
        source === "public_ai_chat"
          ? "Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es später erneut."
          : "Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es später erneut.",
    };
  }

  const normalized = validation.normalized;
  const { data: leadData, error: insertError } = await supabase
    .from("leads")
    .insert({
      company_id: companyId,
      first_name: normalized.firstName,
      last_name: normalized.lastName,
      address: normalized.address,
      phone: normalized.phone,
      email: normalized.email,
      inquiry_type: normalized.inquiryType,
      source,
      status: "new",
      notes: normalized.description,
    })
    .select("id")
    .single();

  if (insertError || !leadData?.id) {
    return { ok: false as const, error: "Beim Speichern Ihrer Anfrage ist ein Fehler aufgetreten." };
  }

  const customerConfirmationScheduledFor = new Date().toISOString();
  const ownerNewLeadScheduledFor = getOwnerNotificationScheduledFor(
    company.timezone,
    company.business_hours,
  );

  const { error: queueError } = await supabase.from("notification_queue").insert([
    {
      company_id: companyId,
      lead_id: leadData.id,
      notification_type: "owner_new_lead",
      status: "pending",
      scheduled_for: ownerNewLeadScheduledFor,
    },
    {
      company_id: companyId,
      lead_id: leadData.id,
      notification_type: "customer_confirmation",
      status: "pending",
      scheduled_for: customerConfirmationScheduledFor,
    },
  ]);

  if (queueError) {
    return {
      ok: false as const,
      error: "Beim Planen der Benachrichtigungen ist ein Fehler aufgetreten.",
    };
  }

  await createAppNotification({
    companyId,
    type: "new_inquiry",
    title: source === "public_ai_chat" ? "Neue AI-Anfrage" : "Neue Anfrage",
    message:
      source === "public_ai_chat"
        ? "Eine neue Anfrage wurde über den AI-Assistenten erfasst."
        : "Eine neue Anfrage wurde über das Formular erfasst.",
    dedupeKey: `new_inquiry:${leadData.id}`,
    metadata: {
      leadId: leadData.id,
      source,
    },
  });

  let market: MarketCode | "unknown" = "unknown";
  try {
    const requestMarket = (await import("@/shared/i18n/request")).getRequestMarket;
    market = (await requestMarket()).market;
  } catch {
    // Intentionally ignore request context failures and keep the analytics event anonymous.
  }

  const analyticsMetadata = {
    inquiryType: normalized.inquiryType,
    hasDescription: Boolean(normalized.description),
    turnCount: turnCount ?? 0,
  };

  trackAnalyticsEvent({
    eventName: source === "public_ai_chat" ? "lead_created_public_ai_chat" : "lead_created_public",
    market,
    companyId,
    isAuthenticated: false,
    metadata: analyticsMetadata,
  });

  if (source === "public_ai_chat") {
    trackAnalyticsEvent({
      eventName: "inquiry_chat_completed",
      market,
      companyId,
      isAuthenticated: false,
      metadata: { inquiryType: normalized.inquiryType, turnCount: turnCount ?? 0 },
    });
  }

  return {
    ok: true as const,
    leadId: leadData.id,
    source,
  };
};
