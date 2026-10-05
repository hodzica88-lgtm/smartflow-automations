import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

import type { PartnerStatus } from "@/features/partners/types";

export const PARTNER_API_CREDENTIAL_PREFIX = "vpk_";

export type PartnerCredentialVerification = {
  partnerId: string;
  keyId: string;
  status: PartnerStatus;
};

type PartnerCredentialRow = {
  partner_id: string;
  key_id: string;
  secret_hash: string;
  revoked_at: string | null;
};

type PartnerRow = {
  id: string;
  status: PartnerStatus;
};

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value,
  );

export const generatePartnerApiSecret = () =>
  randomBytes(32).toString("base64url");

export const hashPartnerApiSecret = (secret: string) =>
  createHash("sha256").update(secret, "utf8").digest("base64url");

export const verifyPartnerApiSecretHash = (secret: string, expectedHash: string) => {
  if (!secret || !expectedHash) {
    return false;
  }

  const candidateHash = createHash("sha256").update(secret, "utf8").digest();
  const expectedBuffer = Buffer.from(expectedHash, "base64url");

  if (candidateHash.length !== expectedBuffer.length) {
    return false;
  }

  try {
    return timingSafeEqual(candidateHash, expectedBuffer);
  } catch {
    return false;
  }
};

export const parsePartnerApiCredential = (
  value: string,
): { keyId: string; secret: string } | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith(PARTNER_API_CREDENTIAL_PREFIX)) {
    return null;
  }

  const separatorIndex = trimmedValue.indexOf(".");
  if (separatorIndex <= PARTNER_API_CREDENTIAL_PREFIX.length) {
    return null;
  }

  const keyId = trimmedValue.slice(PARTNER_API_CREDENTIAL_PREFIX.length, separatorIndex);
  const secret = trimmedValue.slice(separatorIndex + 1);

  if (!keyId || !secret || !isUuid(keyId) || !/^[A-Za-z0-9_-]+$/.test(secret)) {
    return null;
  }

  return { keyId, secret };
};

export const createPartnerCredential = async (
  partnerId: string,
  insertFn: (row: {
    partner_id: string;
    key_id: string;
    secret_hash: string;
  }) => Promise<{ error?: { message?: string } | null } | null> = async (
    row,
  ) => {
    const supabase = createSupabaseServiceRoleClient();

    return supabase.from("partner_credentials").insert(row).select("id").single();
  },
): Promise<{
  credential: string;
  keyId: string;
  secretHash: string;
  plaintextSecret: string;
}> => {
  if (!partnerId || typeof partnerId !== "string") {
    throw new Error("Invalid partner id.");
  }

  const keyId = randomUUID();
  const plaintextSecret = generatePartnerApiSecret();
  const secretHash = hashPartnerApiSecret(plaintextSecret);

  const row = {
    partner_id: partnerId,
    key_id: keyId,
    secret_hash: secretHash,
  };

  const insertResult = await insertFn(row);
  if ((insertResult as { error?: { message?: string } | null } | null)?.error) {
    throw new Error("Unable to create partner credential.");
  }

  return {
    credential: `${PARTNER_API_CREDENTIAL_PREFIX}${keyId}.${plaintextSecret}`,
    keyId,
    secretHash,
    plaintextSecret,
  };
};

export const verifyPartnerApiCredential = async (
  credential: string,
  supabase = createSupabaseServiceRoleClient(),
): Promise<PartnerCredentialVerification | null> => {
  const parsedCredential = parsePartnerApiCredential(credential);

  if (!parsedCredential) {
    return null;
  }

  const { keyId, secret } = parsedCredential;

  const credentialResult = await supabase
    .from("partner_credentials")
    .select("partner_id, key_id, secret_hash, revoked_at")
    .eq("key_id", keyId)
    .maybeSingle();

  if (credentialResult.error || !credentialResult.data) {
    return null;
  }

  const row = credentialResult.data as PartnerCredentialRow;

  if (row.revoked_at) {
    return null;
  }

  if (!verifyPartnerApiSecretHash(secret, row.secret_hash)) {
    return null;
  }

  const partnerResult = await supabase
    .from("partners")
    .select("id, status")
    .eq("id", row.partner_id)
    .maybeSingle();

  if (partnerResult.error || !partnerResult.data) {
    return null;
  }

  const partner = partnerResult.data as PartnerRow;

  if (partner.status !== "active") {
    return {
      partnerId: partner.id,
      keyId: row.key_id,
      status: partner.status,
    };
  }

  await supabase
    .from("partner_credentials")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_id", keyId)
    .select("id");

  return {
    partnerId: partner.id,
    keyId: row.key_id,
    status: partner.status,
  };
};
