import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => vi.fn());
const clientMock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));
const verifyCredentialMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/config/env", () => ({
  loadServerEnv: envMock,
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => clientMock,
}));

vi.mock("@/features/partners/credentials", () => ({
  PARTNER_API_CREDENTIAL_PREFIX: "vpk_",
  generatePartnerApiSecret: vi.fn(() => "partner-secret-123"),
  hashPartnerApiSecret: (secret: string) => `hash:${secret}`,
  verifyPartnerApiCredential: verifyCredentialMock,
}));

const provisioning = await import("@/features/partners/provisioning");

describe("partner provisioning atomic contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.mockReturnValue({
      partnerMeteringEnabled: true,
      partnerProvisioningEnabled: true,
      partnerApiEnabled: false,
    } as never);
    process.env.PARTNER_PROVIDER_SECRET_FONIO = "fonio-secret";
    clientMock.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { status: "active" },
            error: null,
          }),
        }),
      }),
    }));
    verifyCredentialMock.mockResolvedValue({
      partnerId: "partner-1",
      keyId: "11111111-1111-4111-8111-111111111111",
      status: "active",
    });
  });

  it("uses an atomic provisioning RPC instead of creating provider state before the lock", async () => {
    clientMock.rpc.mockResolvedValue({
      data: {
        idempotent: false,
        credential_inserted: true,
        partner_id: "partner-1",
        partner_key: "fonio",
        provider: "fonio",
        provisioning_request_id: "req-1",
        credential_id: "cred-1",
        installation_created: true,
        partner_status: "active",
      },
    });

    const result = await provisioning.provisionPartnerInstallation({
      provider: "Fonio",
      providerInstallId: "install-1",
      requestId: "req-1",
      nonce: "nonce-1",
      issuedAt: "2026-10-05T10:00:00.000Z",
      body: { hello: "world" },
    });

    expect(clientMock.rpc).toHaveBeenCalledWith(
      "provision_provider_installation",
      expect.objectContaining({
        p_provider: "fonio",
        p_provider_install_id: "install-1",
        p_request_id: "req-1",
        p_nonce_hash: expect.any(String),
        p_request_fingerprint: expect.any(String),
        p_credential_key_id: expect.any(String),
        p_credential_secret_hash: expect.any(String),
      }),
    );
    expect(result.partnerId).toBe("partner-1");
    expect(result.credential).toMatch(/^vpk_[0-9a-f-]+\.[A-Za-z0-9_-]+$/);
    expect(clientMock.from).not.toHaveBeenCalled();
  });

  it("uses an atomic recovery RPC and returns the plaintext credential only on success", async () => {
    clientMock.rpc.mockResolvedValue({
      data: {
        recovered: true,
        new_credential_id: "cred-2",
        partner_id: "partner-1",
        partner_status: "active",
      },
    });

    const result = await provisioning.recoverPartnerProvisioningCredential({
      provider: "Fonio",
      providerInstallId: "install-1",
      requestId: "req-1",
      credential: "vpk_11111111-1111-4111-8111-111111111111.secret",
    });

    expect(clientMock.rpc).toHaveBeenCalledWith(
      "recover_partner_provisioning_credential",
      expect.objectContaining({
        p_provider: "fonio",
        p_request_id: "req-1",
        p_provider_install_id: "install-1",
        p_new_credential_key_id: expect.any(String),
        p_new_credential_secret_hash: expect.any(String),
      }),
    );
    expect(result.recovered).toBe(true);
    expect(result.credential).toMatch(/^vpk_[0-9a-f-]+\.[A-Za-z0-9_-]+$/);
    expect(clientMock.from).not.toHaveBeenCalled();
  });
});
