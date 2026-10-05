import { randomUUID } from "node:crypto";

import { createPartnerCredential, generatePartnerApiSecret, hashPartnerApiSecret } from "@/features/partners/credentials";
import type { PartnerBillingModel, PartnerStatus } from "@/features/partners/types";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export type PartnerRecord = {
  id: string;
  partner_key: string;
  name: string;
  status: PartnerStatus;
  billing_model: PartnerBillingModel;
  price_per_customer_minor: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type PartnerCredentialMetadata = {
  id: string;
  key_id: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value,
  );

const normalizePartnerRecord = (row: Record<string, unknown>): PartnerRecord => ({
  id: String(row.id ?? ""),
  partner_key: String(row.partner_key ?? ""),
  name: String(row.name ?? ""),
  status: (row.status as PartnerStatus) ?? "pending",
  billing_model: (row.billing_model as PartnerBillingModel) ?? "per_customer",
  price_per_customer_minor: row.price_per_customer_minor == null ? null : Number(row.price_per_customer_minor),
  currency: String(row.currency ?? "EUR"),
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? new Date().toISOString()),
});

const normalizeCredentialMetadata = (row: Record<string, unknown>): PartnerCredentialMetadata => ({
  id: String(row.id ?? ""),
  key_id: String(row.key_id ?? ""),
  created_at: String(row.created_at ?? new Date().toISOString()),
  last_used_at: typeof row.last_used_at === "string" ? row.last_used_at : null,
  revoked_at: typeof row.revoked_at === "string" ? row.revoked_at : null,
});

const validatePartnerKey = (value: unknown) => {
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (!trimmed || trimmed.length > 64 || !/^[a-z0-9][a-z0-9_-]*$/.test(trimmed)) {
    throw new Error("invalid_partner_key");
  }

  return trimmed;
};

const validateName = (value: unknown) => {
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (!trimmed || trimmed.length > 128) {
    throw new Error("invalid_name");
  }

  return trimmed;
};

const validateBillingModel = (value: unknown) => {
  if (typeof value !== "string" || !["per_customer", "flat", "tiered", "custom"].includes(value)) {
    throw new Error("invalid_billing_model");
  }

  return value as PartnerBillingModel;
};

const validatePrice = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error("invalid_price_per_customer_minor");
  }

  return value;
};

const validateCurrency = (value: unknown) => {
  if (typeof value !== "string" || !/^[A-Z]{3}$/.test(value)) {
    throw new Error("invalid_currency");
  }

  return value;
};

const validatePartnerId = (value: string) => {
  if (!isUuid(value)) {
    throw new Error("invalid_partner_id");
  }

  return value;
};

const ensureAllowedTransition = (current: PartnerStatus, next: PartnerStatus) => {
  const allowed: Record<PartnerStatus, PartnerStatus[]> = {
    pending: ["active", "paused", "terminated"],
    active: ["paused", "terminated"],
    paused: ["active", "terminated"],
    terminated: [],
  };

  if (!allowed[current]?.includes(next)) {
    throw new Error("invalid_status_transition");
  }
};

const getPartnerById = async (supabase: ReturnType<typeof createSupabaseServiceRoleClient>, partnerId: string) => {
  const { data, error } = await supabase
    .from("partners")
    .select("id, partner_key, name, status, billing_model, price_per_customer_minor, currency, created_at, updated_at")
    .eq("id", partnerId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizePartnerRecord(data as Record<string, unknown>);
};

export const createPartner = async ({
  name,
  partnerKey,
  billingModel,
  pricePerCustomerMinor,
  currency,
}: {
  name: string;
  partnerKey: string;
  billingModel: PartnerBillingModel;
  pricePerCustomerMinor?: number | null;
  currency: string;
}): Promise<PartnerRecord> => {
  const cleanedName = validateName(name);
  const cleanedKey = validatePartnerKey(partnerKey);
  const cleanedModel = validateBillingModel(billingModel);
  const cleanedPrice = validatePrice(pricePerCustomerMinor ?? null);
  const cleanedCurrency = validateCurrency(currency);

  const supabase = createSupabaseServiceRoleClient();

  const { data: existingRow, error: lookupError } = await supabase
    .from("partners")
    .select("id")
    .eq("partner_key", cleanedKey)
    .maybeSingle();

  if (lookupError) {
    throw new Error("partner_key_unavailable");
  }

  if (existingRow) {
    throw new Error("partner_key_conflict");
  }

  const { data, error } = await supabase
    .from("partners")
    .insert({
      partner_key: cleanedKey,
      name: cleanedName,
      status: "pending",
      billing_model: cleanedModel,
      price_per_customer_minor: cleanedPrice,
      currency: cleanedCurrency,
    })
    .select("id, partner_key, name, status, billing_model, price_per_customer_minor, currency, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error("partner_creation_failed");
  }

  return normalizePartnerRecord(data as Record<string, unknown>);
};

export const updatePartner = async ({
  partnerId,
  status,
  billingModel,
  pricePerCustomerMinor,
  currency,
}: {
  partnerId: string;
  status?: PartnerStatus;
  billingModel?: PartnerBillingModel;
  pricePerCustomerMinor?: number | null;
  currency?: string;
}): Promise<PartnerRecord> => {
  const validatedPartnerId = validatePartnerId(partnerId);
  const supabase = createSupabaseServiceRoleClient();
  const currentPartner = await getPartnerById(supabase, validatedPartnerId);

  if (!currentPartner) {
    throw new Error("partner_not_found");
  }

  const nextStatus = status ?? currentPartner.status;
  if (nextStatus !== currentPartner.status) {
    ensureAllowedTransition(currentPartner.status, nextStatus);
  }

  if (nextStatus === "terminated") {
    const { error } = await supabase.rpc("terminate_partner", {
      p_partner_id: validatedPartnerId,
    });

    if (error) {
      throw new Error("partner_termination_failed");
    }

    const terminatedPartner = await getPartnerById(supabase, validatedPartnerId);
    if (!terminatedPartner) {
      throw new Error("partner_not_found");
    }

    return terminatedPartner;
  }

  const updates: Record<string, unknown> = {};

  if (status) {
    updates.status = status;
  }

  if (billingModel) {
    updates.billing_model = validateBillingModel(billingModel);
  }

  if (pricePerCustomerMinor !== undefined) {
    updates.price_per_customer_minor = validatePrice(pricePerCustomerMinor);
  }

  if (currency) {
    updates.currency = validateCurrency(currency);
  }

  if (Object.keys(updates).length === 0) {
    return currentPartner;
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("partners")
    .update(updates)
    .eq("id", validatedPartnerId)
    .select("id, partner_key, name, status, billing_model, price_per_customer_minor, currency, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error("partner_update_failed");
  }

  return normalizePartnerRecord(data as Record<string, unknown>);
};

export const listPartnerCredentials = async (partnerId: string): Promise<PartnerCredentialMetadata[]> => {
  const validatedPartnerId = validatePartnerId(partnerId);
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from("partner_credentials")
    .select("id, key_id, created_at, last_used_at, revoked_at")
    .eq("partner_id", validatedPartnerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("credential_listing_failed");
  }

  return (data ?? []).map((row) => normalizeCredentialMetadata(row as Record<string, unknown>));
};

export const issuePartnerCredential = async (partnerId: string) => {
  const validatedPartnerId = validatePartnerId(partnerId);
  const supabase = createSupabaseServiceRoleClient();
  const partner = await getPartnerById(supabase, validatedPartnerId);

  if (!partner) {
    throw new Error("partner_not_found");
  }

  if (partner.status !== "active") {
    throw new Error("partner_not_active");
  }

  const inserted = await createPartnerCredential(validatedPartnerId, async (row) => {
    const { data, error } = await supabase
      .from("partner_credentials")
      .insert(row)
      .select("id, key_id")
      .single();

    if (error) {
      return { error };
    }

    return { data, error: null };
  });

  const { data: credentialRow, error: credentialError } = await supabase
    .from("partner_credentials")
    .select("id, key_id, created_at, last_used_at, revoked_at")
    .eq("key_id", inserted.keyId)
    .maybeSingle();

  if (credentialError || !credentialRow) {
    throw new Error("credential_lookup_failed");
  }

  return {
    credentialId: String((credentialRow as Record<string, unknown>).id ?? ""),
    keyId: inserted.keyId,
    credential: inserted.credential,
    createdAt: String((credentialRow as Record<string, unknown>).created_at ?? new Date().toISOString()),
  };
};

export const revokePartnerCredential = async ({
  partnerId,
  credentialId,
}: {
  partnerId: string;
  credentialId: string;
}) => {
  const validatedPartnerId = validatePartnerId(partnerId);
  const validatedCredentialId = validatePartnerId(credentialId);
  const supabase = createSupabaseServiceRoleClient();

  const { data: credentialRow, error } = await supabase
    .from("partner_credentials")
    .select("id, partner_id, revoked_at")
    .eq("id", validatedCredentialId)
    .maybeSingle();

  if (error || !credentialRow) {
    throw new Error("credential_not_found");
  }

  if (String((credentialRow as Record<string, unknown>).partner_id ?? "") !== validatedPartnerId) {
    throw new Error("credential_not_found");
  }

  if ((credentialRow as Record<string, unknown>).revoked_at) {
    return {
      credentialId: validatedCredentialId,
      partnerId: validatedPartnerId,
      revoked: false,
    };
  }

  const { error: updateError } = await supabase
    .from("partner_credentials")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", validatedCredentialId);

  if (updateError) {
    throw new Error("credential_revoke_failed");
  }

  return {
    credentialId: validatedCredentialId,
    partnerId: validatedPartnerId,
    revoked: true,
  };
};

export const rotatePartnerCredential = async ({
  partnerId,
  credentialId,
}: {
  partnerId: string;
  credentialId: string;
}) => {
  const validatedPartnerId = validatePartnerId(partnerId);
  const validatedCredentialId = validatePartnerId(credentialId);
  const supabase = createSupabaseServiceRoleClient();

  const partner = await getPartnerById(supabase, validatedPartnerId);
  if (!partner) {
    throw new Error("partner_not_found");
  }

  if (partner.status !== "active") {
    throw new Error("partner_not_active");
  }

  const { data: currentCredential, error: credentialLookupError } = await supabase
    .from("partner_credentials")
    .select("id, partner_id, revoked_at")
    .eq("id", validatedCredentialId)
    .maybeSingle();

  if (credentialLookupError || !currentCredential) {
    throw new Error("credential_not_found");
  }

  if (String((currentCredential as Record<string, unknown>).partner_id ?? "") !== validatedPartnerId) {
    throw new Error("credential_not_found");
  }

  if ((currentCredential as Record<string, unknown>).revoked_at) {
    throw new Error("credential_already_revoked");
  }

  const newKeyId = randomUUID();
  const newPlaintextSecret = generatePartnerApiSecret();
  const newSecretHash = hashPartnerApiSecret(newPlaintextSecret);

  const { error: rpcError } = await supabase.rpc("rotate_partner_credential", {
    p_partner_id: validatedPartnerId,
    p_old_credential_id: validatedCredentialId,
    p_new_key_id: newKeyId,
    p_new_secret_hash: newSecretHash,
  });

  if (rpcError) {
    throw new Error("credential_rotation_failed");
  }

  return {
    credential: `vpk_${newKeyId}.${newPlaintextSecret}`,
    credentialId: validatedCredentialId,
    keyId: newKeyId,
    partnerId: validatedPartnerId,
    rotated: true,
  };
};

export const terminatePartner = async (partnerId: string) => {
  const validatedPartnerId = validatePartnerId(partnerId);
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase.rpc("terminate_partner", {
    p_partner_id: validatedPartnerId,
  });

  if (error) {
    throw new Error("partner_termination_failed");
  }

  return getPartnerById(supabase, validatedPartnerId);
};
