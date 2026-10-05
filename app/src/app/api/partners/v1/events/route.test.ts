import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => vi.fn());
const credentialAuthMock = vi.hoisted(() => vi.fn());
const applyEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/config/env", () => ({
  loadServerEnv: envMock,
}));

vi.mock("@/features/partners/credentials", () => ({
  verifyPartnerApiCredential: credentialAuthMock,
}));

vi.mock("@/features/partners/service", () => ({
  applyPartnerEvent: applyEventMock,
  PartnerEventConflictError: class PartnerEventConflictError extends Error {
    constructor(message = "Idempotency conflict.") {
      super(message);
      this.name = "PartnerEventConflictError";
    }
  },
}));

const route = await import("@/app/api/partners/v1/events/route");

describe("partner event API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.mockReturnValue({ partnerMeteringEnabled: true } as never);
  });

  it("returns 404 when the feature flag is off", async () => {
    envMock.mockReturnValue({ partnerMeteringEnabled: false } as never);

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(404);
    expect(credentialAuthMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 for malformed bearer credentials", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated" }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer not-a-valid-credential",
        },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when the partner is not active", async () => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "paused" });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated" }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid request bodies", async () => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: "", external_customer_id: "", event_type: "activated" }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects a request that tries to send partner_id", async () => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({
          partner_id: "other-partner",
          event_id: "evt-1",
          external_customer_id: "cust-1",
          event_type: "activated",
        }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(applyEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: "not-json",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(applyEventMock).not.toHaveBeenCalled();
  });

  it.each([
    { label: "unknown extra field", payload: { event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated", metadata: { ok: true } } },
    { label: "customer_name extra field", payload: { event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated", customer_name: "Alice" } },
    { label: "email extra field", payload: { event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated", email: "user@example.com" } },
    { label: "phone extra field", payload: { event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated", phone: "+4900000000" } },
    { label: "metadata extra field", payload: { event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated", metadata: "not-allowed" } },
  ])("returns 400 for $label", async ({ payload }) => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(applyEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid event_type", async () => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: "evt-1", external_customer_id: "cust-1", event_type: "invalid" }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
  });

  it.each([
    { label: "oversized event_id", payload: { event_id: "e".repeat(129), external_customer_id: "cust-1", event_type: "activated" } },
    { label: "oversized external_customer_id", payload: { event_id: "evt-1", external_customer_id: "c".repeat(129), event_type: "activated" } },
    { label: "whitespace-only event_id", payload: { event_id: "   ", external_customer_id: "cust-1", event_type: "activated" } },
    { label: "whitespace-only external_customer_id", payload: { event_id: "evt-1", external_customer_id: "   ", event_type: "activated" } },
  ])("returns 400 for $label", async ({ payload }) => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
  });

  it.each([
    { label: "invalid occurred_at", payload: { event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated", occurred_at: "not-a-date" } },
    { label: "malformed occurred_at", payload: { event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated", occurred_at: "2026-99-99T00:00:00Z" } },
  ])("returns 400 for $label", async ({ payload }) => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "invalid_request" });
    expect(JSON.stringify(body)).not.toContain("invalid_occurred_at");
    expect(applyEventMock).not.toHaveBeenCalled();
  });

  it("returns 200 when a valid activated event is accepted", async () => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });
    applyEventMock.mockResolvedValue({ ok: true, duplicate: false });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated" }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, duplicate: false });
  });

  it.each([
    ["activated", "activated"],
    ["deactivated", "deactivated"],
    ["reactivated", "reactivated"],
    ["billable_started", "billable_started"],
    ["billable_stopped", "billable_stopped"],
  ])("passes the authenticated partner_id to the RPC for %s events", async (eventType) => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });
    applyEventMock.mockResolvedValue({ ok: true, duplicate: false });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: `evt-${eventType}`, external_customer_id: `cust-${eventType}`, event_type: eventType }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(applyEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerId: "partner-1",
        eventId: `evt-${eventType}`,
        externalCustomerId: `cust-${eventType}`,
        eventType,
      }),
    );
  });

  it("uses the credential partner_id and ignores a request body override", async () => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-a", status: "active" });
    applyEventMock.mockResolvedValue({ ok: true, duplicate: false });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({
          partner_id: "partner-b",
          event_id: "evt-1",
          external_customer_id: "cust-1",
          event_type: "activated",
        }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(applyEventMock).not.toHaveBeenCalled();
  });

  it("uses the authenticated partner_id even if a body partner_id is absent", async () => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-a", status: "active" });
    applyEventMock.mockResolvedValue({ ok: true, duplicate: false });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated" }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(applyEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ partnerId: "partner-a" }),
    );
  });

  it("returns duplicate=true for idempotent retries", async () => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });
    applyEventMock.mockResolvedValue({ ok: true, duplicate: true });

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated" }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, duplicate: true });
  });

  it("returns 409 on idempotency conflicts", async () => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });
    applyEventMock.mockRejectedValue(new Error("idempotency conflict"));

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated" }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(409);
  });

  it("returns 500 for unexpected persistence failures without leaking raw DB details", async () => {
    credentialAuthMock.mockResolvedValue({ partnerId: "partner-1", status: "active" });
    applyEventMock.mockRejectedValue(new Error("database unavailable"));

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/events", {
        method: "POST",
        body: JSON.stringify({ event_id: "evt-1", external_customer_id: "cust-1", event_type: "activated" }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer vpk_123e4567-e89b-12d3-a456-426614174000.secret",
        },
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "server_error" });
  });
});
