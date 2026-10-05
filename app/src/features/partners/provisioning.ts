import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import {
  PARTNER_API_CREDENTIAL_PREFIX,
  generatePartnerApiSecret,
  hashPartnerApiSecret,
  verifyPartnerApiCredential,
} from "@/features/partners/credentials";
import { loadServerEnv } from "@/shared/config/env";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

import type { PartnerStatus } from "@/features/partners/types";

export type ProviderProvisioningSignatureInput = {
  provider: string;
  requestId: string;
  timestamp: string;
  nonce: string;
  signature: string;
  rawBody: string;
};

export type ProvisionPartnerInstallationInput = {
  provider: string;
  providerInstallId: string;
  requestId: string;
  nonce: string;
  issuedAt: string;
  body: Record<string, unknown>;
};

export const canonicalizeProvider = (value: string) => {
  const trimmed = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!trimmed || !/^[a-z0-9][a-z0-9_-]*$/.test(trimmed)) {
    throw new Error("invalid_provider");
  }

  return trimmed;
};

export const getProviderSecretEnvKey = (provider: string) => {
  const canonical = canonicalizeProvider(provider);
  const suffix = canonical
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return `PARTNER_PROVIDER_SECRET_${suffix}`;
};

export const getProviderProvisioningSecret = (provider: string) => {
  try {
    const canonical = canonicalizeProvider(provider);
    const envName = getProviderSecretEnvKey(canonical);
    const value = process.env[envName];

    return value && value.trim().length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
};

const deriveCanonicalRequest = ({
  provider,
  requestId,
  timestamp,
  nonce,
  rawBody,
}: Pick<
  ProviderProvisioningSignatureInput,
  "provider" | "requestId" | "timestamp" | "nonce" | "rawBody"
>) => [provider, requestId, timestamp, nonce, rawBody].join("\n");

export const computeProviderProvisioningSignature = (
  input: Pick<
    ProviderProvisioningSignatureInput,
    "provider" | "requestId" | "timestamp" | "nonce" | "rawBody"
  >,
) => {
  const secret = getProviderProvisioningSecret(input.provider);

  if (!secret) {
    throw new Error("missing_provider_secret");
  }

  const digest = createHmac("sha256", secret)
    .update(deriveCanonicalRequest(input), "utf8")
    .digest("hex");

  return `sha256=${digest}`;
};

export const verifyProviderProvisioningSignature = (
  input: ProviderProvisioningSignatureInput,
): boolean => {
  const secret = getProviderProvisioningSecret(input.provider);
  const providedSignature = input.signature?.trim() ?? "";

  if (!secret || !providedSignature) {
    return false;
  }

  const expectedSignature = computeProviderProvisioningSignature({
    provider: input.provider,
    requestId: input.requestId,
    timestamp: input.timestamp,
    nonce: input.nonce,
    rawBody: input.rawBody,
  });

  const provided = providedSignature.startsWith("sha256=")
    ? providedSignature.slice("sha256=".length)
    : providedSignature;
  const expected = expectedSignature.startsWith("sha256=")
    ? expectedSignature.slice("sha256=".length)
    : expectedSignature;

  if (!provided || provided.length !== expected.length) {
    return false;
  }

  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  try {
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
};

export const deriveRequestFingerprint = (body: Record<string, unknown>) => {
  const sorted = Object.keys(body)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = body[key];
      return accumulator;
    }, {});

  return createHash("sha256")
    .update(JSON.stringify(sorted), "utf8")
    .digest("hex");
};

const normalizeInstallId = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed || !/^[A-Za-z0-9._:-]+$/.test(trimmed)) {
    throw new Error("invalid_provider_install_id");
  }

  return trimmed;
};

const normalizeRequestField = (value: string, fieldName: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`invalid_${fieldName}`);
  }

  return trimmed;
};

const generateProvisioningCredential = () => {
  const keyId = randomUUID();
  const plaintextSecret = generatePartnerApiSecret();
  return {
    keyId,
    plaintextSecret,
    secretHash: hashPartnerApiSecret(plaintextSecret),
    credential: `${PARTNER_API_CREDENTIAL_PREFIX}${keyId}.${plaintextSecret}`,
  };
};

export const provisionPartnerInstallation = async (
  input: ProvisionPartnerInstallationInput,
): Promise<{
  created: boolean;
  partnerId: string;
  partnerKey: string;
  partnerStatus: PartnerStatus;
  credential: string;
}> => {
  const env = loadServerEnv();

  if (!env.partnerMeteringEnabled || !env.partnerProvisioningEnabled) {
    throw new Error("provisioning_disabled");
  }

  const provider = canonicalizeProvider(input.provider);
  if (!getProviderProvisioningSecret(provider)) {
    throw new Error("unknown_provider");
  }

  const providerInstallId = normalizeInstallId(input.providerInstallId);
  const requestId = normalizeRequestField(input.requestId, "request_id");
  const nonce = normalizeRequestField(input.nonce, "nonce");
  const issuedAt = input.issuedAt || new Date().toISOString();

  const supabase = createSupabaseServiceRoleClient();
  const requestFingerprint = deriveRequestFingerprint(input.body ?? {});
  const nonceHash = createHash("sha256").update(nonce, "utf8").digest("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const credential = generateProvisioningCredential();
  const partnerName = provider;
  const partnerKey = provider;

  const { data, error } = await supabase.rpc("provision_provider_installation", {
    p_provider: provider,
    p_provider_install_id: providerInstallId,
    p_request_id: requestId,
    p_nonce_hash: nonceHash,
    p_request_fingerprint: requestFingerprint,
    p_issued_at: issuedAt,
    p_expires_at: expiresAt,
    p_partner_name: partnerName,
    p_partner_key: partnerKey,
    p_credential_key_id: credential.keyId,
    p_credential_secret_hash: credential.secretHash,
  });

  if (error) {
    const message = String(error.message ?? "").toLowerCase();
    if (message.includes("replay") || message.includes("duplicate") || message.includes("nonce")) {
      throw new Error("provisioning_request_replay");
    }
    throw new Error(error.message ?? "provisioning_request_failed");
  }

  const row = (data ?? {}) as Record<string, unknown>;
  const partnerId = String(row.partner_id ?? "");
  const partnerStatus = (row.partner_status as PartnerStatus) ?? "active";
  const created = Boolean(row.credential_inserted);

  if (!partnerId) {
    throw new Error("provisioning_request_failed");
  }

  return {
    created,
    partnerId,
    partnerKey: String(row.partner_key ?? provider),
    partnerStatus,
    credential: created ? credential.credential : "",
  };
};

export const confirmPartnerProvisioningCredential = async ({
  provider,
  providerInstallId,
  requestId,
  credential,
}: {
  provider: string;
  providerInstallId: string;
  requestId: string;
  credential: string;
}): Promise<{
  confirmed: boolean;
  partnerId: string;
  providerInstallId: string;
  requestId: string;
}> => {
  const env = loadServerEnv();

  if (!env.partnerMeteringEnabled || !env.partnerProvisioningEnabled) {
    throw new Error("provisioning_disabled");
  }

  const normalizedProvider = canonicalizeProvider(provider);
  const normalizedInstallId = normalizeInstallId(providerInstallId);
  const normalizedRequestId = normalizeRequestField(requestId, "request_id");
  const supabase = createSupabaseServiceRoleClient();

  const authResult = await verifyPartnerApiCredential(credential, supabase);
  if (!authResult || authResult.status !== "active") {
    throw new Error("invalid_partner_credential");
  }

  const { data: bindingRow, error: bindingError } = await supabase
    .from("partner_provider_bindings")
    .select("partner_id")
    .eq("provider", normalizedProvider)
    .maybeSingle();

  if (bindingError || !bindingRow || String(bindingRow.partner_id) !== authResult.partnerId) {
    throw new Error("provider_binding_mismatch");
  }

  const { data: keyRecord } = await supabase
    .from("partner_credentials")
    .select("id")
    .eq("key_id", authResult.keyId)
    .eq("partner_id", authResult.partnerId)
    .maybeSingle();

  if (!keyRecord) {
    throw new Error("credential_not_found");
  }

  const { data: requestRecord } = await supabase
    .from("partner_provisioning_requests")
    .select("id, credential_id, status, expires_at")
    .eq("provider", normalizedProvider)
    .eq("request_id", normalizedRequestId)
    .maybeSingle();

  if (!requestRecord || String(requestRecord.credential_id) !== String(keyRecord.id)) {
    throw new Error("invalid_provisioning_request");
  }

  if (
    requestRecord.status === "expired" ||
    requestRecord.status === "replayed" ||
    requestRecord.status === "failed"
  ) {
    throw new Error("expired_provisioning_request");
  }

  if (new Date(String(requestRecord.expires_at)).getTime() < Date.now()) {
    throw new Error("expired_provisioning_request");
  }

  const { data: installationRecord } = await supabase
    .from("partner_installations")
    .select("id")
    .eq("provider", normalizedProvider)
    .eq("provider_install_id", normalizedInstallId)
    .maybeSingle();

  if (!installationRecord) {
    throw new Error("invalid_provider_installation");
  }

  const { error: updateError } = await supabase
    .from("partner_provisioning_requests")
    .update({
      status: "confirmed",
      credential_confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", String(requestRecord.id));

  if (updateError) {
    throw new Error("provisioning_confirmation_failed");
  }

  return {
    confirmed: true,
    partnerId: authResult.partnerId,
    providerInstallId: normalizedInstallId,
    requestId: normalizedRequestId,
  };
};

export const recoverPartnerProvisioningCredential = async ({
  provider,
  providerInstallId,
  requestId,
  credential,
}: {
  provider: string;
  providerInstallId: string;
  requestId: string;
  credential: string;
}): Promise<{
  recovered: boolean;
  credential: string;
  partnerId: string;
  partnerStatus: PartnerStatus;
}> => {
  const env = loadServerEnv();

  if (!env.partnerMeteringEnabled || !env.partnerProvisioningEnabled) {
    throw new Error("provisioning_disabled");
  }

  const normalizedProvider = canonicalizeProvider(provider);
  const normalizedInstallId = normalizeInstallId(providerInstallId);
  const normalizedRequestId = normalizeRequestField(requestId, "request_id");
  const supabase = createSupabaseServiceRoleClient();

  const authResult = await verifyPartnerApiCredential(credential, supabase);
  if (!authResult || authResult.status !== "active") {
    throw new Error("invalid_partner_credential");
  }

  const recoveryCredential = generateProvisioningCredential();

  const { data, error } = await supabase.rpc("recover_partner_provisioning_credential", {
    p_provider: normalizedProvider,
    p_request_id: normalizedRequestId,
    p_provider_install_id: normalizedInstallId,
    p_new_credential_key_id: recoveryCredential.keyId,
    p_new_credential_secret_hash: recoveryCredential.secretHash,
  });

  if (error) {
    const message = String(error.message ?? "").toLowerCase();
    if (message.includes("recovery") || message.includes("recovered") || message.includes("credential")) {
      throw new Error("credential_recovery_failed");
    }
    throw new Error(error.message ?? "provisioning_recovery_failed");
  }

  const row = (data ?? {}) as Record<string, unknown>;
  const partnerId = String(row.partner_id ?? authResult.partnerId);
  const partnerStatus = (row.partner_status as PartnerStatus) ?? "active";

  return {
    recovered: Boolean(row.recovered),
    credential: recoveryCredential.credential,
    partnerId,
    partnerStatus,
  };
};
