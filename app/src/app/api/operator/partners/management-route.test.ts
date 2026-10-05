import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => vi.fn());
const supabaseAuthUserMock = vi.hoisted(() => vi.fn());
const createPartnerMock = vi.hoisted(() => vi.fn());
const updatePartnerMock = vi.hoisted(() => vi.fn());
const listPartnerCredentialsMock = vi.hoisted(() => vi.fn());
const issuePartnerCredentialMock = vi.hoisted(() => vi.fn());
const revokePartnerCredentialMock = vi.hoisted(() => vi.fn());
const rotatePartnerCredentialMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/config/env", () => ({
  loadServerEnv: envMock,
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: supabaseAuthUserMock },
  })),
}));

vi.mock("@/features/auth/primary-account", () => ({
  isPrimaryOwnerOperatorAccount: (email: string | null | undefined) =>
    (email ?? "").trim().toLowerCase() === "hodzica88@gmail.com",
}));

vi.mock("@/features/partners/management", () => ({
  createPartner: createPartnerMock,
  updatePartner: updatePartnerMock,
  listPartnerCredentials: listPartnerCredentialsMock,
  issuePartnerCredential: issuePartnerCredentialMock,
  revokePartnerCredential: revokePartnerCredentialMock,
  rotatePartnerCredential: rotatePartnerCredentialMock,
}));

const createRoute = await import("@/app/api/operator/partners/route");
const updateRoute = await import("@/app/api/operator/partners/[partnerId]/route");
const credentialsRoute = await import("@/app/api/operator/partners/[partnerId]/credentials/route");
const revokeRoute = await import("@/app/api/operator/partners/[partnerId]/credentials/[credentialId]/revoke/route");
const rotateRoute = await import("@/app/api/operator/partners/[partnerId]/credentials/[credentialId]/rotate/route");

const partnerId = "11111111-1111-4111-8111-111111111111";
const credentialId = "22222222-2222-4222-8222-222222222222";

const mockPrimaryOwnerUser = () => {
  supabaseAuthUserMock.mockResolvedValue({
    data: { user: { email: "hodzica88@gmail.com" } },
  });
};

const mockCustomerUser = () => {
  supabaseAuthUserMock.mockResolvedValue({
    data: { user: { email: "customer@example.com" } },
  });
};

const mockOperatorUser = () => {
  supabaseAuthUserMock.mockResolvedValue({
    data: { user: { email: "operator@example.com" } },
  });
};

describe("owner management API surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.mockReturnValue({ partnerMeteringEnabled: true } as never);
    mockPrimaryOwnerUser();
  });

  it("returns 404 when partner metering is disabled for creation", async () => {
    envMock.mockReturnValue({ partnerMeteringEnabled: false } as never);

    const response = await createRoute.POST(
      new Request("http://localhost/api/operator/partners", {
        method: "POST",
        body: JSON.stringify({
          name: "Acme",
          partner_key: "acme",
          billing_model: "per_customer",
          price_per_customer_minor: 0,
          currency: "EUR",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(404);
    expect(createPartnerMock).not.toHaveBeenCalled();
  });

  it("returns 404 when partner metering is disabled for credential routes", async () => {
    envMock.mockReturnValue({ partnerMeteringEnabled: false } as never);

    const response = await credentialsRoute.GET(
      new Request("http://localhost/api/operator/partners/${partnerId}/credentials"),
      { params: { partnerId } },
    );

    expect(response.status).toBe(404);
    expect(listPartnerCredentialsMock).not.toHaveBeenCalled();
  });

  it("creates a pending partner for a valid primary-owner request", async () => {
    createPartnerMock.mockResolvedValue({
      id: partnerId,
      partner_key: "acme",
      name: "Acme",
      status: "pending",
      billing_model: "per_customer",
      price_per_customer_minor: 0,
      currency: "EUR",
    });

    const response = await createRoute.POST(
      new Request("http://localhost/api/operator/partners", {
        method: "POST",
        body: JSON.stringify({
          name: "Acme",
          partner_key: "acme",
          billing_model: "per_customer",
          price_per_customer_minor: 0,
          currency: "EUR",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(201);
    expect(createPartnerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Acme",
        partnerKey: "acme",
        billingModel: "per_customer",
        currency: "EUR",
      }),
    );
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.partner.status).toBe("pending");
  });

  it("rejects unknown fields and direct active creation", async () => {
    const response = await createRoute.POST(
      new Request("http://localhost/api/operator/partners", {
        method: "POST",
        body: JSON.stringify({
          name: "Acme",
          partner_key: "acme",
          billing_model: "per_customer",
          status: "active",
          currency: "EUR",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    expect(createPartnerMock).not.toHaveBeenCalled();
  });

  it("rejects malformed partner_key and invalid billing model inputs", async () => {
    createPartnerMock.mockRejectedValue(new Error("invalid_partner_key"));
    const invalidKeyResponse = await createRoute.POST(
      new Request("http://localhost/api/operator/partners", {
        method: "POST",
        body: JSON.stringify({
          name: "Acme",
          partner_key: "Acme!",
          billing_model: "per_customer",
          currency: "EUR",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    createPartnerMock.mockRejectedValue(new Error("invalid_billing_model"));
    const invalidBillingResponse = await createRoute.POST(
      new Request("http://localhost/api/operator/partners", {
        method: "POST",
        body: JSON.stringify({
          name: "Acme",
          partner_key: "acme",
          billing_model: "unknown",
          currency: "EUR",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(invalidKeyResponse.status).toBe(400);
    expect(invalidBillingResponse.status).toBe(400);
  });

  it("rejects unauthenticated, customer, and generic operator callers", async () => {
    supabaseAuthUserMock.mockResolvedValue({ data: { user: null } });
    const unauthenticated = await createRoute.POST(
      new Request("http://localhost/api/operator/partners", {
        method: "POST",
        body: JSON.stringify({
          name: "Acme",
          partner_key: "acme",
          billing_model: "per_customer",
          currency: "EUR",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(unauthenticated.status).toBe(401);

    mockCustomerUser();
    const customerResponse = await createRoute.POST(
      new Request("http://localhost/api/operator/partners", {
        method: "POST",
        body: JSON.stringify({
          name: "Acme",
          partner_key: "acme",
          billing_model: "per_customer",
          currency: "EUR",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(customerResponse.status).toBe(403);

    mockOperatorUser();
    const operatorResponse = await createRoute.POST(
      new Request("http://localhost/api/operator/partners", {
        method: "POST",
        body: JSON.stringify({
          name: "Acme",
          partner_key: "acme",
          billing_model: "per_customer",
          currency: "EUR",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(operatorResponse.status).toBe(403);
  });

  it("accepts the primary owner for status updates and lists credentials safely", async () => {
    updatePartnerMock.mockResolvedValue({
      id: partnerId,
      partner_key: "acme",
      name: "Acme",
      status: "paused",
      billing_model: "per_customer",
      price_per_customer_minor: 0,
      currency: "EUR",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    });

    const updateResponse = await updateRoute.PATCH(
      new Request("http://localhost/api/operator/partners/${partnerId}", {
        method: "PATCH",
        body: JSON.stringify({ status: "paused" }),
        headers: { "content-type": "application/json" },
      }),
      { params: { partnerId } },
    );

    expect(updateResponse.status).toBe(200);
    expect(updatePartnerMock).toHaveBeenCalledWith(
      expect.objectContaining({ partnerId, status: "paused" }),
    );

    listPartnerCredentialsMock.mockResolvedValue([
      {
        id: credentialId,
        key_id: "123e4567-e89b-12d3-a456-426614174000",
        created_at: "2026-01-02T00:00:00.000Z",
        last_used_at: null,
        revoked_at: null,
      },
    ]);

    const listResponse = await credentialsRoute.GET(
      new Request("http://localhost/api/operator/partners/${partnerId}/credentials"),
      { params: { partnerId } },
    );

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.ok).toBe(true);
    expect(listBody.credentials[0]).not.toHaveProperty("secret_hash");
    expect(listBody.credentials[0]).not.toHaveProperty("plaintext_secret");
  });

  it("issues a credential only for active partners and never returns hashes", async () => {
    issuePartnerCredentialMock.mockResolvedValue({
      credentialId: credentialId,
      keyId: "123e4567-e89b-12d3-a456-426614174000",
      credential: "vpk_123e4567-e89b-12d3-a456-426614174000.aGVsbG8",
      createdAt: "2026-01-02T00:00:00.000Z",
    });

    const response = await credentialsRoute.POST(
      new Request("http://localhost/api/operator/partners/${partnerId}/credentials", {
        method: "POST",
      }),
      { params: { partnerId } },
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.credential.startsWith("vpk_")).toBe(true);
    expect(body).not.toHaveProperty("secret_hash");
    expect(body).not.toHaveProperty("plaintextSecret");

    issuePartnerCredentialMock.mockRejectedValue(new Error("partner_not_active"));
    const rejectedResponse = await credentialsRoute.POST(
      new Request("http://localhost/api/operator/partners/${partnerId}/credentials", {
        method: "POST",
      }),
      { params: { partnerId } },
    );

    expect(rejectedResponse.status).toBe(400);
  });

  it("revokes and rotates credentials through the primary-owner routes", async () => {
    revokePartnerCredentialMock.mockResolvedValue({ revoked: true });

    const revokeResponse = await revokeRoute.POST(
      new Request("http://localhost/api/operator/partners/${partnerId}/credentials/${credentialId}/revoke", {
        method: "POST",
      }),
      { params: { partnerId, credentialId } },
    );

    expect(revokeResponse.status).toBe(200);
    const revokeBody = await revokeResponse.json();
    expect(revokeBody).toEqual({ ok: true });

    rotatePartnerCredentialMock.mockResolvedValue({
      credential: "vpk_33333333-3333-4333-8333-333333333333.new-secret",
      rotated: true,
    });

    const rotateResponse = await rotateRoute.POST(
      new Request("http://localhost/api/operator/partners/${partnerId}/credentials/${credentialId}/rotate", {
        method: "POST",
      }),
      { params: { partnerId, credentialId } },
    );

    expect(rotateResponse.status).toBe(200);
    const rotateBody = await rotateResponse.json();
    expect(rotateBody.ok).toBe(true);
    expect(rotateBody.credential.startsWith("vpk_")).toBe(true);
    expect(rotateBody).not.toHaveProperty("secret_hash");
    expect(rotateBody).not.toHaveProperty("old_secret");
  });

  it("blocks bad UUIDs and rejects wrong-partner revoke/rotate attempts", async () => {
    const invalidRevoke = await revokeRoute.POST(
      new Request("http://localhost/api/operator/partners/not-a-uuid/credentials/not-a-uuid/revoke", {
        method: "POST",
      }),
      { params: { partnerId: "not-a-uuid", credentialId: "not-a-uuid" } },
    );

    expect(invalidRevoke.status).toBe(400);

    revokePartnerCredentialMock.mockRejectedValue(new Error("credential_not_found"));
    const wrongPartnerRevoke = await revokeRoute.POST(
      new Request("http://localhost/api/operator/partners/${partnerId}/credentials/${credentialId}/revoke", {
        method: "POST",
      }),
      { params: { partnerId, credentialId } },
    );

    expect(wrongPartnerRevoke.status).toBe(400);

    rotatePartnerCredentialMock.mockRejectedValue(new Error("credential_not_found"));
    const wrongPartnerRotate = await rotateRoute.POST(
      new Request("http://localhost/api/operator/partners/${partnerId}/credentials/${credentialId}/rotate", {
        method: "POST",
      }),
      { params: { partnerId, credentialId } },
    );

    expect(wrongPartnerRotate.status).toBe(400);
  });
});
