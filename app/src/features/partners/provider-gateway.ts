import { createHmac, timingSafeEqual } from "node:crypto";

import { applyPartnerEvent, PartnerEventConflictError } from "@/features/partners/service";
import type { PartnerEventType } from "@/features/partners/types";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type ProviderGatewayState = "SUPPORTED" | "CONTRACT_PENDING";

export type ProviderGatewayCapability =
  | "webhook_hmac_raw_body"
  | "webhook_hmac_canonical"
  | "bearer_shared_secret"
  | "api_key_header"
  | "oauth_jwt";

export type ProviderGatewayVerifier = (input: {
  provider: string;
  rawBody: string;
  headers: Headers;
}) => boolean;

export type ProviderGatewayEntry = {
  id: string;
  state: ProviderGatewayState;
  capabilities: ProviderGatewayCapability[];
  verifier: ProviderGatewayVerifier | null;
};

export type ProviderEventEnvelope = {
  provider: string;
  providerEventId?: string;
  providerInstallId?: string;
  externalCustomerId?: string;
  eventType?: string;
  occurredAt?: string;
  rawEventType?: string;
};

export type ProviderLifecycleMapping = {
  eventType: PartnerEventType;
  providerEventId: string;
  externalCustomerId: string;
  occurredAt?: string;
};

const PROVIDER_EVENT_ID_KEYS = [
  "provider_event_id",
  "event_id",
  "id",
  "providerEventId",
  "eventId",
];

const PROVIDER_INSTALL_ID_KEYS = [
  "provider_install_id",
  "providerInstallId",
  "installation_id",
  "install_id",
  "installId",
];

const PROVIDER_CUSTOMER_ID_KEYS = [
  "external_customer_id",
  "customer_id",
  "externalCustomerId",
  "customerId",
  "user_id",
  "userId",
];

const EVENT_TYPE_KEYS = ["event_type", "eventType", "type", "kind"];
const OCCURRED_AT_KEYS = ["occurred_at", "occurredAt", "timestamp", "created_at", "createdAt"];

const canonicalizeProviderId = (value: string) => {
  const trimmed = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!trimmed || !/^[a-z0-9][a-z0-9_-]*$/.test(trimmed)) {
    throw new Error("invalid_provider");
  }

  return trimmed;
};

export const getProviderSecretEnvKey = (provider: string) => {
  const canonical = canonicalizeProviderId(provider);
  const suffix = canonical
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return `PARTNER_PROVIDER_SECRET_${suffix}`;
};

export const getProviderSecret = (provider: string) => {
  try {
    const canonical = canonicalizeProviderId(provider);
    const envName = getProviderSecretEnvKey(canonical);
    const value = process.env[envName];
    return value && value.trim().length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
};

export const getProviderRegistryEntry = (provider: string): ProviderGatewayEntry | null => {
  try {
    const normalized = canonicalizeProviderId(provider);
    return PROVIDER_REGISTRY[normalized] ?? null;
  } catch {
    return null;
  }
};

const constantTimeStringCompare = (a: string, b: string) => {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
};

const compareHexDigests = (expected: string, actual: string) => {
  const left = Buffer.from(expected.trim(), "hex");
  const right = Buffer.from(actual.trim(), "hex");

  if (left.length !== right.length) {
    return false;
  }

  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
};

const getHeaderValue = (headers: Headers, candidateNames: string[]) => {
  for (const name of candidateNames) {
    const value = headers.get(name) ?? headers.get(name.toLowerCase()) ?? headers.get(name.toUpperCase());
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
};

export const verifySharedSecretBearer = (secret: string | undefined, authorizationHeader: string | null) => {
  if (!secret || !authorizationHeader) {
    return false;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  if (!match) {
    return false;
  }

  const supplied = match[1].trim();
  return constantTimeStringCompare(supplied, secret);
};

export const verifyApiKeyHeader = (secret: string | undefined, headerValue: string | null) => {
  if (!secret || !headerValue) {
    return false;
  }

  return constantTimeStringCompare(headerValue.trim(), secret);
};

export const getOutboundAuthHeaders = (provider: string, mode: "bearer" | "api-key") => {
  const secret = getProviderSecret(provider);

  if (!secret) {
    return {};
  }

  if (mode === "bearer") {
    return { Authorization: `Bearer ${secret}` };
  }

  return { "x-api-key": secret };
};

const readCallIdCandidateFromJson = (rawBody: string) => {
  if (!rawBody) {
    return "";
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "";
    }

    const value = (parsed as Record<string, unknown>).call_id ?? (parsed as Record<string, unknown>).callId;
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
};

export const verifySynthflowWebhook = ({ provider, rawBody, headers }: Parameters<ProviderGatewayVerifier>[0]) => {
  if (provider !== "synthflow") {
    return false;
  }

  const secret = getProviderSecret(provider);
  const headerCallId = getHeaderValue(headers, ["call_id", "call-id", "x-call-id", "x-synthflow-call-id"]);
  const payloadCallId = readCallIdCandidateFromJson(rawBody);
  const callId = headerCallId || payloadCallId;
  const signature = getHeaderValue(headers, ["HTTP_SYNTHFLOW_SIGNATURE", "http_synthflow_signature", "x-synthflow-signature"]);

  if (!secret || !callId || !signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(callId, "utf8").digest();
  const base64Signature = signature.trim();

  try {
    const decoded = Buffer.from(base64Signature, "base64");
    if (decoded.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(expected, decoded);
  } catch {
    return false;
  }
};

export const verifyElevenLabsWebhook = ({ provider, rawBody, headers }: Parameters<ProviderGatewayVerifier>[0]) => {
  if (provider !== "elevenlabs") {
    return false;
  }

  const secret = getProviderSecret(provider);
  const signature = getHeaderValue(headers, ["ElevenLabs-Signature", "elevenlabs-signature", "x-elevenlabs-signature"]);

  if (!secret || !signature) {
    return false;
  }

  const parts = signature
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex <= 0) {
        return accumulator;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (key && value) {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});

  const timestamp = Number(parts.t ?? "");
  const hexSignature = parts.v0 ?? "";

  if (!Number.isFinite(timestamp) || !hexSignature) {
    return false;
  }

  const nowSeconds = Date.now() / 1000;
  const staleWindowSeconds = 300;
  if (Math.abs(nowSeconds - timestamp) > staleWindowSeconds) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  return compareHexDigests(expected, hexSignature);
};

export const verifyVapiWebhook = ({ provider, rawBody, headers }: Parameters<ProviderGatewayVerifier>[0]) => {
  if (provider !== "vapi") {
    return false;
  }

  const secret = getProviderSecret(provider);
  const bearerToken = getHeaderValue(headers, ["authorization"]);
  const apiKeyValue = getHeaderValue(headers, ["x-vapi-key", "x-api-key", "api-key"]);
  const signatureValue = getHeaderValue(headers, [
    "x-vapi-signature",
    "x-vapi-webhook-signature",
    "x-vapi-signature-sha256",
    "x-vapi-webhook-signature-sha256",
  ]);

  if (secret && bearerToken && verifySharedSecretBearer(secret, bearerToken)) {
    return true;
  }

  if (secret && apiKeyValue && verifyApiKeyHeader(secret, apiKeyValue)) {
    return true;
  }

  if (secret && signatureValue) {
    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    return compareHexDigests(expected, signatureValue.trim());
  }

  return false;
};

export const verifyProviderWebhookAuthentication: ProviderGatewayVerifier = ({ provider, rawBody, headers }) => {
  const entry = getProviderRegistryEntry(provider);

  if (!entry || entry.state === "CONTRACT_PENDING" || !entry.verifier) {
    return false;
  }

  return entry.verifier({ provider, rawBody, headers });
};

const PROVIDER_REGISTRY: Record<string, ProviderGatewayEntry> = Object.freeze({
  synthflow: {
    id: "synthflow",
    state: "SUPPORTED",
    capabilities: ["webhook_hmac_canonical"],
    verifier: verifySynthflowWebhook,
  },
  elevenlabs: {
    id: "elevenlabs",
    state: "SUPPORTED",
    capabilities: ["webhook_hmac_raw_body"],
    verifier: verifyElevenLabsWebhook,
  },
  vapi: {
    id: "vapi",
    state: "SUPPORTED",
    capabilities: ["bearer_shared_secret", "api_key_header", "webhook_hmac_raw_body", "oauth_jwt"],
    verifier: verifyVapiWebhook,
  },
  goai: {
    id: "goai",
    state: "CONTRACT_PENDING",
    capabilities: [],
    verifier: null,
  },
  onlim: {
    id: "onlim",
    state: "CONTRACT_PENDING",
    capabilities: [],
    verifier: null,
  },
  saalt: {
    id: "saalt",
    state: "CONTRACT_PENDING",
    capabilities: ["bearer_shared_secret", "api_key_header"],
    verifier: null,
  },
  vier: {
    id: "vier",
    state: "CONTRACT_PENDING",
    capabilities: [],
    verifier: null,
  },
  parloa: {
    id: "parloa",
    state: "CONTRACT_PENDING",
    capabilities: [],
    verifier: null,
  },
  cognigy: {
    id: "cognigy",
    state: "CONTRACT_PENDING",
    capabilities: [],
    verifier: null,
  },
  retell: {
    id: "retell",
    state: "CONTRACT_PENDING",
    capabilities: [],
    verifier: null,
  },
});

const readPayloadValue = (payload: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

export const normalizeProviderEvent = (provider: string, payload: Record<string, unknown>): ProviderEventEnvelope => {
  const providerEventId = readPayloadValue(payload, PROVIDER_EVENT_ID_KEYS);
  const providerInstallId = readPayloadValue(payload, PROVIDER_INSTALL_ID_KEYS);
  const externalCustomerId = readPayloadValue(payload, PROVIDER_CUSTOMER_ID_KEYS);
  const eventTypeValue = readPayloadValue(payload, EVENT_TYPE_KEYS);
  const occurredAtValue = readPayloadValue(payload, OCCURRED_AT_KEYS);

  const eventType = typeof eventTypeValue === "string" ? eventTypeValue.trim().toLowerCase() : undefined;
  const rawEventType = typeof eventTypeValue === "string" ? eventTypeValue.trim() : undefined;

  return {
    provider,
    providerEventId: typeof providerEventId === "string" ? providerEventId.trim() : undefined,
    providerInstallId: typeof providerInstallId === "string" ? providerInstallId.trim() : undefined,
    externalCustomerId: typeof externalCustomerId === "string" ? externalCustomerId.trim() : undefined,
    eventType,
    occurredAt: typeof occurredAtValue === "string" ? occurredAtValue.trim() : undefined,
    rawEventType,
  };
};

const PROVIDER_LIFECYCLE_EVENT_MAP: Record<string, Record<string, PartnerEventType>> = Object.freeze({});

export const mapProviderLifecycleEvent = (
  provider: string,
  envelope: ProviderEventEnvelope,
): ProviderLifecycleMapping | null => {
  const normalizedProvider = canonicalizeProviderId(provider);
  const entry = getProviderRegistryEntry(normalizedProvider);

  if (!entry || entry.state === "CONTRACT_PENDING") {
    return null;
  }

  if (!envelope.providerEventId || !envelope.externalCustomerId || !envelope.rawEventType) {
    return null;
  }

  const providerMap = PROVIDER_LIFECYCLE_EVENT_MAP[normalizedProvider];
  if (!providerMap) {
    return null;
  }

  const mappedEventType = providerMap[envelope.rawEventType.trim().toLowerCase()];
  if (!mappedEventType) {
    return null;
  }

  return {
    eventType: mappedEventType,
    providerEventId: envelope.providerEventId,
    externalCustomerId: envelope.externalCustomerId,
    occurredAt: envelope.occurredAt,
  };
};

export const resolveProviderPartnerId = async (provider: string): Promise<string | null> => {
  const normalizedProvider = canonicalizeProviderId(provider);
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from("partner_provider_bindings")
    .select("partner_id")
    .eq("provider", normalizedProvider)
    .maybeSingle();

  if (error || !data || !data.partner_id) {
    return null;
  }

  return String(data.partner_id);
};

export const applyProviderLifecycleEvent = async ({
  provider,
  envelope,
  externalCustomerId,
  occurredAt,
}: {
  provider: string;
  envelope: ProviderEventEnvelope;
  externalCustomerId: string;
  occurredAt?: string;
}) => {
  const mapped = mapProviderLifecycleEvent(provider, envelope);
  if (!mapped) {
    return { ok: true, ignored: true, duplicate: false };
  }

  const partnerId = await resolveProviderPartnerId(provider);
  if (!partnerId) {
    return { ok: true, ignored: true, duplicate: false };
  }

  try {
    const result = await applyPartnerEvent({
      partnerId,
      eventId: mapped.providerEventId,
      externalCustomerId,
      eventType: mapped.eventType,
      occurredAt: occurredAt ?? new Date().toISOString(),
    });

    return { ok: true, ignored: false, duplicate: Boolean(result.duplicate) };
  } catch (error) {
    if (error instanceof PartnerEventConflictError) {
      return { ok: false, ignored: false, duplicate: true, conflict: true };
    }

    throw error;
  }
};
