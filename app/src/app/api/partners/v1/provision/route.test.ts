import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => vi.fn());
const provisionServiceMock = vi.hoisted(() => vi.fn());
const confirmServiceMock = vi.hoisted(() => vi.fn());
const recoverServiceMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/config/env", () => ({
  loadServerEnv: envMock,
}));

vi.mock("@/features/partners/provisioning", () => ({
  provisionPartnerInstallation: provisionServiceMock,
  confirmPartnerProvisioningCredential: confirmServiceMock,
  recoverPartnerProvisioningCredential: recoverServiceMock,
}));

const route = await import("@/app/api/partners/v1/provision/route");
const confirmRoute = await import("@/app/api/partners/v1/provision/confirm/route");
const recoverRoute = await import("@/app/api/partners/v1/provision/recover/route");

describe("provisioning API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.mockReturnValue({
      partnerMeteringEnabled: true,
      partnerProvisioningEnabled: true,
      partnerApiEnabled: false,
    } as never);
  });

  it("returns 404 when provisioning is disabled", async () => {
    envMock.mockReturnValue({
      partnerMeteringEnabled: true,
      partnerProvisioningEnabled: false,
      partnerApiEnabled: false,
    } as never);

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/provision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider_install_id: "install-1" }),
      }),
    );

    expect(response.status).toBe(404);
    expect(provisionServiceMock).not.toHaveBeenCalled();
  });

  it("rejects requests missing trusted headers", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/provision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider_install_id: "install-1" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(provisionServiceMock).not.toHaveBeenCalled();
  });

  it("forwards a valid signed request to the provisioning service", async () => {
    provisionServiceMock.mockResolvedValue({
      ok: true,
      created: true,
      partnerId: "partner-1",
      partnerKey: "fonio",
      partnerStatus: "active",
      credential: "vpk_123e4567-e89b-12d3-a456-426614174000.secret",
    });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/provision", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-varnito-provider": "fonio",
          "x-varnito-request-id": "req-1",
          "x-varnito-timestamp": "2026-10-05T10:00:00.000Z",
          "x-varnito-nonce": "nonce-1",
          "x-varnito-signature": "sha256=abc123",
        },
        body: JSON.stringify({ provider_install_id: "install-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(provisionServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "fonio",
        providerInstallId: "install-1",
        requestId: "req-1",
        nonce: "nonce-1",
      }),
    );
  });

  it("requires a bearer credential for confirm and recovery requests", async () => {
    const confirmResponse = await confirmRoute.POST(
      new Request("http://localhost/api/partners/v1/provision/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-varnito-provider": "fonio",
          "x-varnito-request-id": "req-1",
          "x-varnito-timestamp": "2026-10-05T10:00:00.000Z",
          "x-varnito-nonce": "nonce-1",
          "x-varnito-signature": "sha256=abc123",
        },
        body: JSON.stringify({ provider_install_id: "install-1", request_id: "req-1" }),
      }),
    );

    const recoverResponse = await recoverRoute.POST(
      new Request("http://localhost/api/partners/v1/provision/recover", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-varnito-provider": "fonio",
          "x-varnito-request-id": "req-1",
          "x-varnito-timestamp": "2026-10-05T10:00:00.000Z",
          "x-varnito-nonce": "nonce-1",
          "x-varnito-signature": "sha256=abc123",
        },
        body: JSON.stringify({ provider_install_id: "install-1", request_id: "req-1" }),
      }),
    );

    expect(confirmResponse.status).toBe(401);
    expect(recoverResponse.status).toBe(401);
    expect(confirmServiceMock).not.toHaveBeenCalled();
    expect(recoverServiceMock).not.toHaveBeenCalled();
  });
});
