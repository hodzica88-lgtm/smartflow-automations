import { describe, expect, it, vi } from "vitest";

import {
  createPartnerCredential,
  generatePartnerApiSecret,
  hashPartnerApiSecret,
  parsePartnerApiCredential,
  verifyPartnerApiCredential,
  verifyPartnerApiSecretHash,
} from "@/features/partners/credentials";

const makeCredentialRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  partner_id: "partner-1",
  key_id: "123e4567-e89b-12d3-a456-426614174000",
  secret_hash: hashPartnerApiSecret("correct-secret"),
  revoked_at: null,
  ...overrides,
});

const makePartnerRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "partner-1",
  status: "active",
  ...overrides,
});

const buildSupabaseMock = ({
  credentialRow,
  partnerRow,
  updateSpy,
}: {
  credentialRow: Record<string, unknown> | null;
  partnerRow: Record<string, unknown> | null;
  updateSpy: ReturnType<typeof vi.fn>;
}) => ({
  from: (table: string) => {
    if (table === "partner_credentials") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: credentialRow, error: null }),
          })),
        })),
        update: updateSpy,
      };
    }

    if (table === "partners") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: partnerRow, error: null }),
          })),
        })),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  },
});

describe("partner API credential helpers", () => {
  it("generates a high-entropy secret", () => {
    const secret = generatePartnerApiSecret();

    expect(secret).toMatch(/^[-A-Za-z0-9_]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(43);
    expect(secret.startsWith("vpk_")).toBe(false);
  });

  it("stores a hash, not the plaintext secret", () => {
    const secret = generatePartnerApiSecret();
    const hash = hashPartnerApiSecret(secret);

    expect(hash).not.toBe(secret);
    expect(hash.length).toBeGreaterThan(40);
  });

  it("parses a valid credential format", () => {
    const keyId = "123e4567-e89b-12d3-a456-426614174000";
    const secret = generatePartnerApiSecret();
    const credential = `vpk_${keyId}.${secret}`;

    expect(parsePartnerApiCredential(credential)).toEqual({
      keyId,
      secret,
    });
  });

  it("rejects malformed credential strings", () => {
    expect(parsePartnerApiCredential("invalid")).toBeNull();
    expect(parsePartnerApiCredential("vpk_invalid")).toBeNull();
    expect(parsePartnerApiCredential("vpk_123e4567-e89b-12d3-a456-426614174000")).toBeNull();
  });

  it("rejects wrong secrets with constant-time verification semantics", () => {
    const secret = generatePartnerApiSecret();
    const wrongSecret = generatePartnerApiSecret();

    expect(verifyPartnerApiSecretHash(secret, hashPartnerApiSecret(wrongSecret))).toBe(false);
    expect(verifyPartnerApiSecretHash(secret, hashPartnerApiSecret(secret))).toBe(true);
  });

  it("creates a credential record with the correct plaintext-once contract", async () => {
    const partnerId = "11111111-1111-4111-8111-111111111111";
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });

    const result = await createPartnerCredential(partnerId, insert as never);

    expect(result.credential.startsWith("vpk_")).toBe(true);
    expect(result.plaintextSecret.length).toBeGreaterThanOrEqual(43);
    expect(result.secretHash).toBe(hashPartnerApiSecret(result.plaintextSecret));
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        partner_id: partnerId,
        key_id: expect.any(String),
        secret_hash: result.secretHash,
      }),
    );
  });

  it("rejects an unknown key_id", async () => {
    const supabase = buildSupabaseMock({
      credentialRow: null,
      partnerRow: null,
      updateSpy: vi.fn(),
    });

    const result = await verifyPartnerApiCredential(
      "vpk_123e4567-e89b-12d3-a456-426614174000.correct-secret",
      supabase as never,
    );

    expect(result).toBeNull();
  });

  it("rejects a revoked credential", async () => {
    const updateSpy = vi.fn();
    const supabase = buildSupabaseMock({
      credentialRow: makeCredentialRow({ revoked_at: "2026-10-04T13:00:00.000Z" }),
      partnerRow: makePartnerRow({ id: "partner-1", status: "active" }),
      updateSpy,
    });

    const result = await verifyPartnerApiCredential(
      "vpk_123e4567-e89b-12d3-a456-426614174000.correct-secret",
      supabase as never,
    );

    expect(result).toBeNull();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it.each(["pending", "paused", "terminated"])(
    "rejects a %s partner through the credential status flow",
    async (status) => {
      const updateSpy = vi.fn();
      const supabase = buildSupabaseMock({
        credentialRow: makeCredentialRow(),
        partnerRow: makePartnerRow({ id: "partner-1", status }),
        updateSpy,
      });

      const result = await verifyPartnerApiCredential(
        "vpk_123e4567-e89b-12d3-a456-426614174000.correct-secret",
        supabase as never,
      );

      expect(result).toEqual({
        partnerId: "partner-1",
        keyId: "123e4567-e89b-12d3-a456-426614174000",
        status,
      });
      expect(updateSpy).not.toHaveBeenCalled();
    },
  );

  it("accepts an active partner credential", async () => {
    const updateSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: [{ id: "cred-1" }], error: null }),
      })),
    }));

    const supabase = buildSupabaseMock({
      credentialRow: makeCredentialRow(),
      partnerRow: makePartnerRow({ id: "partner-1", status: "active" }),
      updateSpy,
    });

    const result = await verifyPartnerApiCredential(
      "vpk_123e4567-e89b-12d3-a456-426614174000.correct-secret",
      supabase as never,
    );

    expect(result).toEqual({
      partnerId: "partner-1",
      keyId: "123e4567-e89b-12d3-a456-426614174000",
      status: "active",
    });
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it("derives partner_id from the credential record, not the request body", async () => {
    const updateSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: [{ id: "cred-1" }], error: null }),
      })),
    }));

    const supabase = buildSupabaseMock({
      credentialRow: makeCredentialRow({ partner_id: "partner-2" }),
      partnerRow: makePartnerRow({ id: "partner-2", status: "active" }),
      updateSpy,
    });

    const result = await verifyPartnerApiCredential(
      "vpk_123e4567-e89b-12d3-a456-426614174000.correct-secret",
      supabase as never,
    );

    expect(result?.partnerId).toBe("partner-2");
    expect(result?.status).toBe("active");
  });

  it("updates last_used_at after successful active authentication", async () => {
    const updateSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: [{ id: "cred-1" }], error: null }),
      })),
    }));

    const supabase = buildSupabaseMock({
      credentialRow: makeCredentialRow(),
      partnerRow: makePartnerRow({ id: "partner-1", status: "active" }),
      updateSpy,
    });

    await verifyPartnerApiCredential(
      "vpk_123e4567-e89b-12d3-a456-426614174000.correct-secret",
      supabase as never,
    );

    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it("does not update last_used_at for wrong secret", async () => {
    const updateSpy = vi.fn();
    const supabase = buildSupabaseMock({
      credentialRow: makeCredentialRow({ secret_hash: hashPartnerApiSecret("other-secret") }),
      partnerRow: makePartnerRow({ id: "partner-1", status: "active" }),
      updateSpy,
    });

    const result = await verifyPartnerApiCredential(
      "vpk_123e4567-e89b-12d3-a456-426614174000.correct-secret",
      supabase as never,
    );

    expect(result).toBeNull();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("does not update last_used_at for revoked credentials", async () => {
    const updateSpy = vi.fn();
    const supabase = buildSupabaseMock({
      credentialRow: makeCredentialRow({ revoked_at: "2026-10-04T13:00:00.000Z" }),
      partnerRow: makePartnerRow({ id: "partner-1", status: "active" }),
      updateSpy,
    });

    const result = await verifyPartnerApiCredential(
      "vpk_123e4567-e89b-12d3-a456-426614174000.correct-secret",
      supabase as never,
    );

    expect(result).toBeNull();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("does not update last_used_at for inactive partners", async () => {
    const updateSpy = vi.fn();
    const supabase = buildSupabaseMock({
      credentialRow: makeCredentialRow(),
      partnerRow: makePartnerRow({ id: "partner-1", status: "paused" }),
      updateSpy,
    });

    const result = await verifyPartnerApiCredential(
      "vpk_123e4567-e89b-12d3-a456-426614174000.correct-secret",
      supabase as never,
    );

    expect(result).toEqual({
      partnerId: "partner-1",
      keyId: "123e4567-e89b-12d3-a456-426614174000",
      status: "paused",
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
