import { createHash } from "node:crypto";

import { headers } from "next/headers";

import { trackAnalyticsEvent } from "@/features/analytics/events";
import { createAppNotification } from "@/features/notifications/service";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { getOwnerNotificationScheduledFor } from "@/shared/utils/businessHours";

export const FALLBACK_INQUIRY_TYPE = "Allgemeine Anfrage";

export type InquirySource = "public_ai_chat" | "public_form";
export type MarketCode = "de" | "us" | "unknown";

export { buildInquirySummary } from "./summary";

export type InquiryTypeSuggestion = {
  suggestedInquiryType: string;
  summary: string;
  question: string;
  options: string[];
  method: "deterministic" | "ai" | "fallback";
  confidence: number;
  requiresTypeSelection: boolean;
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
  idempotencyKey?: string;
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

const getNormalizedLeadEmail = (value: string) => value.trim().toLowerCase();

const hashPublicInquiryValue = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export const createPublicInquiryIdempotencyKey = ({
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
}: {
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
}) => {
  const canonicalInput = JSON.stringify([
    String(companyId ?? "").trim(),
    String(source ?? ""),
    String(firstName ?? "").trim(),
    String(lastName ?? "").trim(),
    String(address ?? "").trim(),
    String(phone ?? "").trim(),
    String(email ?? "").trim().toLowerCase(),
    String(inquiryType ?? "").trim(),
    String(description ?? "").trim(),
    String(website ?? "").trim(),
    ...(allowedInquiryTypes ?? []).map((entry) => normalizeInquiryTypeName(String(entry ?? ""))).filter(Boolean).sort(),
  ]);

  return hashPublicInquiryValue(canonicalInput);
};

export const createPublicInquiryRequestHash = ({
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
}: {
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
}) => createPublicInquiryIdempotencyKey({
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

export const MAX_PUBLIC_INQUIRY_DESCRIPTION_LENGTH = 1500;
export const MAX_PUBLIC_REQUEST_BODY_BYTES = 16384;
export const PUBLIC_INQUIRY_ACTIONS = [
  "track-start",
  "track-fallback-form",
  "suggest-type",
  "submit",
] as const;

export const validatePublicInquiryActionRequest = ({
  action,
  companyId,
  description,
  payloadSizeBytes,
}: {
  action?: unknown;
  companyId?: unknown;
  description?: unknown;
  payloadSizeBytes?: number;
}): { ok: true; action: (typeof PUBLIC_INQUIRY_ACTIONS)[number]; companyId: string } | { ok: false; error: string; status: number } => {
  const resolvedAction = typeof action === "string" ? action.trim() : "submit";
  const safeCompanyId = typeof companyId === "string" ? companyId.trim() : "";
  const safeDescription = typeof description === "string" ? description.trim() : "";

  if (typeof payloadSizeBytes === "number" && payloadSizeBytes > MAX_PUBLIC_REQUEST_BODY_BYTES) {
    return { ok: false, error: "Anfrage zu groß.", status: 413 };
  }

  if (!PUBLIC_INQUIRY_ACTIONS.includes(resolvedAction as (typeof PUBLIC_INQUIRY_ACTIONS)[number])) {
    return { ok: false, error: "Unbekannte Anfrage.", status: 400 };
  }

  if (!safeCompanyId || safeCompanyId.length > 128 || !/^[A-Za-z0-9_-]+$/.test(safeCompanyId)) {
    return { ok: false, error: "Ungültige Firma.", status: 400 };
  }

  if (resolvedAction === "suggest-type") {
    if (!safeDescription) {
      return { ok: false, error: "Bitte beschreiben Sie Ihr Anliegen.", status: 400 };
    }

    if (safeDescription.length > MAX_PUBLIC_INQUIRY_DESCRIPTION_LENGTH) {
      return { ok: false, error: "Ihre Beschreibung ist zu lang.", status: 413 };
    }
  }

  return { ok: true, action: resolvedAction as (typeof PUBLIC_INQUIRY_ACTIONS)[number], companyId: safeCompanyId };
};

export const getContactDetailsQuestion = (market?: MarketCode | "unknown") => {
  if (market === "us") {
    return "Thanks. Please provide your contact details so the business can reach you.";
  }

  return "Danke. Bitte geben Sie uns noch Ihre Kontaktdaten, damit der Betrieb Sie erreichen kann.";
};

export const getContactDetailsFields = (market?: MarketCode | "unknown") => {
  const isUs = market === "us";

  return [
    { name: "firstName", label: isUs ? "First name" : "Vorname", placeholder: isUs ? "Jane" : "Max" },
    { name: "lastName", label: isUs ? "Last name" : "Nachname", placeholder: isUs ? "Doe" : "Mustermann" },
    { name: "address", label: isUs ? "Address" : "Adresse", placeholder: isUs ? "123 Main St" : "Musterstraße 1" },
    { name: "phone", label: isUs ? "Phone number" : "Telefonnummer", placeholder: isUs ? "+1 555 123 4567" : "+49 711 123456" },
    { name: "email", label: isUs ? "Email address" : "E-Mail-Adresse", placeholder: isUs ? "name@example.com" : "max@example.com" },
  ] as const;
};

export const validateContactDetailsInput = ({
  firstName,
  lastName,
  address,
  phone,
  email,
  market,
}: {
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  email: string;
  market?: MarketCode | "unknown";
}): { ok: true; normalized: { firstName: string; lastName: string; address: string; phone: string; email: string } } | { ok: false; error: string } => {
  const isUs = market === "us";
  const trimmedFirstName = normalizeWhitespace(firstName);
  const trimmedLastName = normalizeWhitespace(lastName);
  const trimmedAddress = normalizeWhitespace(address);
  const trimmedPhone = normalizeWhitespace(phone);
  const trimmedEmail = normalizeWhitespace(email);

  if (!trimmedFirstName) {
    return { ok: false, error: isUs ? "Please enter your first name." : "Bitte geben Sie Ihren Vornamen ein." };
  }

  if (!trimmedLastName) {
    return { ok: false, error: isUs ? "Please enter your last name." : "Bitte geben Sie Ihren Nachnamen ein." };
  }

  if (!trimmedAddress) {
    return { ok: false, error: isUs ? "Please enter your address." : "Bitte geben Sie Ihre Adresse ein." };
  }

  if (!trimmedPhone || !isValidPhone(trimmedPhone)) {
    return { ok: false, error: isUs ? "Please enter a valid phone number." : "Bitte geben Sie eine gültige Telefonnummer ein." };
  }

  if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
    return { ok: false, error: isUs ? "Please enter a valid email address." : "Bitte geben Sie eine gültige E-Mail-Adresse ein." };
  }

  return {
    ok: true,
    normalized: {
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      address: trimmedAddress,
      phone: trimmedPhone,
      email: getNormalizedLeadEmail(trimmedEmail),
    },
  };
};

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

  if (description && description.trim().length > MAX_PUBLIC_INQUIRY_DESCRIPTION_LENGTH) {
    return { ok: false, error: "Ihre Beschreibung ist zu lang." };
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

type InquiryRateLimitBucket = "public_ai_chat_preview" | "public_ai_chat_submit" | "public_form";

export const maybeRecordRateLimit = async ({
  supabase,
  companyId,
  clientIp,
  bucket,
}: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  companyId: string;
  clientIp: string;
  bucket: InquiryRateLimitBucket;
}) => {
  const isPreviewBucket = bucket === "public_ai_chat_preview";
  const rpcName = isPreviewBucket
    ? "check_and_record_inquiry_chat_rate_limit"
    : "check_and_record_inquiry_rate_limit";

  const { data, error } = await supabase.rpc(rpcName, {
    p_company_id: companyId,
    p_client_ip: clientIp,
    p_max_submissions: isPreviewBucket ? 15 : 5,
    p_window_minutes: isPreviewBucket ? 30 : 10,
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    return { allowed: false } as const;
  }

  const allowed = Boolean((data[0] as { allowed?: unknown }).allowed);
  return { allowed } as const;
};

export const enforcePublicSuggestionRateLimit = async ({
  companyId,
}: {
  companyId: string;
}) => {
  const clientIp = await getClientIpForRateLimit();
  if (!clientIp) {
    return { allowed: false } as const;
  }

  const supabase = createSupabaseServiceRoleClient();
  return maybeRecordRateLimit({
    supabase,
    companyId,
    clientIp,
    bucket: "public_ai_chat_preview",
  });
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

const matchesInquiryPattern = (text: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(text));

const shouldAskForInquiryType = ({
  description,
  allowedInquiryTypes,
}: {
  description: string;
  allowedInquiryTypes: string[];
}) => {
  if (allowedInquiryTypes.length <= 1) {
    return false;
  }

  const text = normalizeWhitespace(description).toLowerCase();
  const normalizedTypes = allowedInquiryTypes.map((entry) => normalizeInquiryTypeName(entry).toLowerCase());

  const typeMatchers = [
    {
      patterns: [/heizung|heizungsreparatur|heizungsanlage|heizkoerper|heizkörper|heating|boiler|radiator|hvac/i],
      matches: normalizedTypes.filter((entry) => /heizung|heating|hvac|radiator/.test(entry)),
    },
    {
      patterns: [/klima|klimaanlage|luftung|ac|air conditioning|cooling/i],
      matches: normalizedTypes.filter((entry) => /klima|ac|air conditioning|cooling/.test(entry)),
    },
    {
      patterns: [/rohr|wasser|leitung|sanitär|sanitar|plumbing|pipe|water|drain/i],
      matches: normalizedTypes.filter((entry) => /rohr|wasser|plumbing|pipe|water|drain/.test(entry)),
    },
    {
      patterns: [/elektro|strom|steckdose|installation|electrical|power|outlet|wiring/i],
      matches: normalizedTypes.filter((entry) => /elektro|strom|electrical|power|outlet|wiring/.test(entry)),
    },
    {
      patterns: [/dach|abdichtung|roof|waterproofing|repair/i],
      matches: normalizedTypes.filter((entry) => /dach|roof|waterproofing|repair/.test(entry)),
    },
  ];

  const matchedType = typeMatchers.find(({ patterns }) => matchesInquiryPattern(text, patterns));
  if (!matchedType) {
    return true;
  }

  return matchedType.matches.length === 0;
};

const buildContextualFollowUpQuestion = ({
  description,
  market,
}: {
  description: string;
  market?: MarketCode | "unknown";
}) => {
  const text = normalizeWhitespace(description).toLowerCase();
  const german = market !== "us";

  if (/heizung|heizungs|heizkörper|heizkörper|heating|heater|boiler|radiator/.test(text)) {
    return german
      ? "Verstanden. Können Sie kurz beschreiben, was genau nicht funktioniert – wird die Heizung gar nicht warm, zeigt sie eine Fehlermeldung oder macht sie ungewöhnliche Geräusche?"
      : "Understood. Can you briefly describe what is failing — is the heating not warming up at all, is there an error code, or is it making unusual noises?";
  }

  if (/klima|klimaanlage|ac|air conditioning|cooling/.test(text)) {
    return german
      ? "Verstanden. Funktioniert die Klimaanlage gar nicht, liefert sie zu wenig Kühlung oder zeigt sie eine Fehlermeldung?"
      : "Understood. Is the cooling system not working at all, delivering too little cooling, or showing an error?";
  }

  if (/rohr|wasser|leitung|sanitär|plumbing|pipe|water|drain/.test(text)) {
    return german
      ? "Verstanden. Ist das Problem ein Wasserverlust, ein verstopfter Ablauf oder ein Defekt an einer Leitung?"
      : "Understood. Is this a leak, a blocked drain, or a damaged pipe or fixture?";
  }

  if (/elektro|strom|steckdose|installation|electrical|power|outlet|wiring/.test(text)) {
    return german
      ? "Verstanden. Ist die Anlage komplett ohne Strom, gibt es ein Problem mit einer Sicherung oder einer Steckdose, oder ist ein Gerät betroffen?"
      : "Understood. Is the issue total power loss, a tripped breaker or outlet, or a specific appliance affected?";
  }

  if (/dach|abdichtung|roof|waterproofing|leak/.test(text)) {
    return german
      ? "Verstanden. Ist das Problem ein Leck, eine undichte Stelle oder ein sichtbarer Schaden am Dachbereich?"
      : "Understood. Is this a leak, a visible roof defect, or a damaged area that needs attention?";
  }

  return german
    ? `Verstanden. Können Sie kurz beschreiben, was genau nicht funktioniert und welche Auswirkungen das auf Sie hat?`
    : `Understood. Can you briefly describe what is failing and what impact it is having?`;
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
  const requiresTypeSelection = shouldAskForInquiryType({
    description,
    allowedInquiryTypes: safeAllowedInquiryTypes,
  });
  const summary = `${description.trim().slice(0, 120)}${description.length > 120 ? "…" : ""}`;
  const question = requiresTypeSelection
    ? market === "us"
      ? "What type of request would you like to send?"
      : "Welche Art von Anfrage möchten Sie senden?"
    : buildContextualFollowUpQuestion({ description, market });

  return {
    suggestedInquiryType: fallbackType,
    summary,
    question,
    options: requiresTypeSelection ? safeAllowedInquiryTypes.slice(0, 4) : [],
    method: "deterministic",
    confidence: 0.75,
    requiresTypeSelection,
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
  idempotencyKey,
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
    bucket: source === "public_form" ? "public_form" : "public_ai_chat_submit",
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
  const effectiveIdempotencyKey = (idempotencyKey ?? "").trim();

  if (!effectiveIdempotencyKey) {
    return { ok: false as const, error: "Eindeutiger Anfrage-Schlüssel fehlt.", status: 400 };
  }

  const requestHash = createPublicInquiryRequestHash({
    companyId,
    firstName: normalized.firstName,
    lastName: normalized.lastName,
    address: normalized.address,
    phone: normalized.phone,
    email: normalized.email,
    inquiryType: normalized.inquiryType,
    description: normalized.description,
    website: website ?? null,
    allowedInquiryTypes,
    source,
  });
  const customerConfirmationScheduledFor = new Date().toISOString();
  const ownerNewLeadScheduledFor = getOwnerNotificationScheduledFor(
    company.timezone,
    company.business_hours,
  );

  const { data: leadData, error: insertError } = await supabase.rpc(
    "create_public_inquiry_lead_with_notifications_idempotent",
    {
      p_company_id: companyId,
      p_first_name: normalized.firstName,
      p_last_name: normalized.lastName,
      p_address: normalized.address,
      p_phone: normalized.phone,
      p_email: normalized.email,
      p_inquiry_type: normalized.inquiryType,
      p_source: source,
      p_notes: normalized.description,
      p_customer_confirmation_scheduled_for: customerConfirmationScheduledFor,
      p_owner_new_lead_scheduled_for: ownerNewLeadScheduledFor,
      p_idempotency_key: effectiveIdempotencyKey,
      p_request_hash: requestHash,
      p_idempotency_ttl_hours: 24,
    },
  );

  const leadPayload = Array.isArray(leadData) ? leadData[0] : leadData;
  const createdLeadId = leadPayload?.lead_id;
  const isDuplicate = Boolean(leadPayload?.duplicate === true);

  if (insertError) {
    const message = String(insertError.message ?? "").toLowerCase();
    if (message.includes("idempotency") || message.includes("different payload") || message.includes("duplicate key")) {
      return { ok: false as const, error: "Diese Anfrage wurde bereits mit anderem Inhalt gesendet.", status: 409 };
    }
    return { ok: false as const, error: "Beim Speichern Ihrer Anfrage ist ein Fehler aufgetreten." };
  }

  if (!createdLeadId) {
    return { ok: false as const, error: "Beim Speichern Ihrer Anfrage ist ein Fehler aufgetreten." };
  }

  if (isDuplicate) {
    return {
      ok: true as const,
      leadId: createdLeadId,
      source,
      duplicate: true,
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
    dedupeKey: `new_inquiry:${createdLeadId}`,
    metadata: {
      leadId: createdLeadId,
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
    leadId: createdLeadId,
    source,
    duplicate: false,
  };
};
