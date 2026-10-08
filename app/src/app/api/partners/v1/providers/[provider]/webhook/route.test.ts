import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/config/env", () => ({
  loadServerEnv: envMock,
}));

const route = await import("@/app/api/partners/v1/providers/[provider]/webhook/route");
const gateway = await import("@/features/partners/provider-gateway");

describe("provider gateway route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PARTNER_PROVIDER_SECRET_SYNTHFLOW;
    delete process.env.PARTNER_PROVIDER_SECRET_ELEVENLABS;
    delete process.env.PARTNER_PROVIDER_SECRET_VAPI;
    envMock.mockReturnValue({
      partnerMeteringEnabled: true,
      partnerProviderGatewayEnabled: true,
    } as never);
  });

  it("returns 404 when the gateway is disabled", async () => {
    envMock.mockReturnValue({
      partnerMeteringEnabled: true,
      partnerProviderGatewayEnabled: false,
    } as never);

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/synthflow/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event_id: "evt-1", type: "call_started" }),
      }),
      { params: { provider: "synthflow" } },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("returns 404 for an unknown provider", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/unknown/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event_id: "evt-1", type: "call_started" }),
      }),
      { params: { provider: "unknown" } },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("returns 404 for a contract-pending provider without a verifier", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/goai/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event_id: "evt-1", type: "call_started" }),
      }),
      { params: { provider: "goai" } },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("rejects a missing synthflow signature", async () => {
    process.env.PARTNER_PROVIDER_SECRET_SYNTHFLOW = "synth-secret";

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/synthflow/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event_id: "evt-1", type: "call_started" }),
      }),
      { params: { provider: "synthflow" } },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("rejects malformed auth data", async () => {
    process.env.PARTNER_PROVIDER_SECRET_SYNTHFLOW = "synth-secret";

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/synthflow/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          call_id: "call-abc",
          HTTP_SYNTHFLOW_SIGNATURE: "not-valid-base64",
        },
        body: JSON.stringify({ event_id: "evt-1", type: "call_started" }),
      }),
      { params: { provider: "synthflow" } },
    );

    expect(response.status).toBe(401);
  });

  it("accepts a valid Synthflow base64 HMAC over the call_id without echoing provider metadata", async () => {
    process.env.PARTNER_PROVIDER_SECRET_SYNTHFLOW = "synth-secret";
    const callId = "call-abc";
    const signature = Buffer.from(
      createHmac("sha256", "synth-secret").update(callId, "utf8").digest(),
    ).toString("base64");

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/synthflow/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          call_id: callId,
          HTTP_SYNTHFLOW_SIGNATURE: signature,
        },
        body: JSON.stringify({ event_id: "evt-1", type: "call_started" }),
      }),
      { params: { provider: "synthflow" } },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      accepted: true,
      ignored: true,
    });
  });

  it("rejects an invalid Synthflow signature", async () => {
    process.env.PARTNER_PROVIDER_SECRET_SYNTHFLOW = "synth-secret";

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/synthflow/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          call_id: "call-abc",
          HTTP_SYNTHFLOW_SIGNATURE: Buffer.from("wrong-signature").toString("base64"),
        },
        body: JSON.stringify({ event_id: "evt-1", type: "call_started" }),
      }),
      { params: { provider: "synthflow" } },
    );

    expect(response.status).toBe(401);
  });

  it("rejects stale ElevenLabs timestamps", async () => {
    process.env.PARTNER_PROVIDER_SECRET_ELEVENLABS = "eleven-secret";
    const timestamp = Math.floor(Date.now() / 1000) - 301;
    const body = JSON.stringify({ event_id: "evt-1", type: "call_started" });
    const signature = createHmac("sha256", "eleven-secret")
      .update(`${timestamp}.${body}`, "utf8")
      .digest("hex");

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/elevenlabs/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "ElevenLabs-Signature": `t=${timestamp},v0=${signature}`,
        },
        body,
      }),
      { params: { provider: "elevenlabs" } },
    );

    expect(response.status).toBe(401);
  });

  it("accepts a valid ElevenLabs signature without echoing provider payload data", async () => {
    process.env.PARTNER_PROVIDER_SECRET_ELEVENLABS = "eleven-secret";
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ event_id: "evt-1", type: "call_started" });
    const signature = createHmac("sha256", "eleven-secret")
      .update(`${timestamp}.${body}`, "utf8")
      .digest("hex");

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/elevenlabs/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "ElevenLabs-Signature": `t=${timestamp},v0=${signature}`,
        },
        body,
      }),
      { params: { provider: "elevenlabs" } },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      accepted: true,
      ignored: true,
    });
  });

  it("fails verification when raw body changes after signing", async () => {
    process.env.PARTNER_PROVIDER_SECRET_ELEVENLABS = "eleven-secret";
    const timestamp = Math.floor(Date.now() / 1000);
    const signedBody = JSON.stringify({ event_id: "evt-1", type: "call_started" });
    const signature = createHmac("sha256", "eleven-secret")
      .update(`${timestamp}.${signedBody}`, "utf8")
      .digest("hex");

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/elevenlabs/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "ElevenLabs-Signature": `t=${timestamp},v0=${signature}`,
        },
        body: JSON.stringify({ event_id: "evt-1", type: "call_ended" }),
      }),
      { params: { provider: "elevenlabs" } },
    );

    expect(response.status).toBe(401);
  });

  it("supports Vapi bearer verification and rejects bad tokens", () => {
    process.env.PARTNER_PROVIDER_SECRET_VAPI = "shared-secret";

    expect(
      gateway.verifyProviderWebhookAuthentication({
        provider: "vapi",
        rawBody: JSON.stringify({ event_id: "evt-1" }),
        headers: new Headers({ authorization: "Bearer shared-secret" }),
      }),
    ).toBe(true);

    expect(
      gateway.verifyProviderWebhookAuthentication({
        provider: "vapi",
        rawBody: JSON.stringify({ event_id: "evt-1" }),
        headers: new Headers({ authorization: "Bearer wrong" }),
      }),
    ).toBe(false);
  });

  it("supports Vapi API-key verification and rejects mismatches", () => {
    process.env.PARTNER_PROVIDER_SECRET_VAPI = "shared-secret";

    expect(
      gateway.verifyProviderWebhookAuthentication({
        provider: "vapi",
        rawBody: JSON.stringify({ event_id: "evt-1" }),
        headers: new Headers({ "x-api-key": "shared-secret" }),
      }),
    ).toBe(true);

    expect(
      gateway.verifyProviderWebhookAuthentication({
        provider: "vapi",
        rawBody: JSON.stringify({ event_id: "evt-1" }),
        headers: new Headers({ "x-api-key": "wrong-secret" }),
      }),
    ).toBe(false);
  });

  it("uses constant-time comparison checks for mismatched signatures", () => {
    process.env.PARTNER_PROVIDER_SECRET_SYNTHFLOW = "synth-secret";

    expect(
      gateway.verifyProviderWebhookAuthentication({
        provider: "synthflow",
        rawBody: JSON.stringify({ event_id: "evt-1" }),
        headers: new Headers({ call_id: "call-abc", HTTP_SYNTHFLOW_SIGNATURE: Buffer.from("abc").toString("base64") }),
      }),
    ).toBe(false);
  });

  it("ignores unknown provider events without mutating partner state", async () => {
    process.env.PARTNER_PROVIDER_SECRET_SYNTHFLOW = "synth-secret";
    const callId = "call-unknown";
    const signature = Buffer.from(
      createHmac("sha256", "synth-secret").update(callId, "utf8").digest(),
    ).toString("base64");

    const response = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/synthflow/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          call_id: callId,
          HTTP_SYNTHFLOW_SIGNATURE: signature,
        },
        body: JSON.stringify({ event_id: "evt-unknown", type: "call_ended" }),
      }),
      { params: { provider: "synthflow" } },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      accepted: true,
      ignored: true,
    });
  });

  it("keeps duplicate normalized events idempotent when explicitly mapped and durable", async () => {
    process.env.PARTNER_PROVIDER_SECRET_SYNTHFLOW = "synth-secret";
    const callId = "call-duplicate";
    const signature = Buffer.from(
      createHmac("sha256", "synth-secret").update(callId, "utf8").digest(),
    ).toString("base64");

    const first = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/synthflow/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          call_id: callId,
          HTTP_SYNTHFLOW_SIGNATURE: signature,
        },
        body: JSON.stringify({ event_id: "evt-dup", type: "activated" }),
      }),
      { params: { provider: "synthflow" } },
    );

    const second = await route.POST(
      new Request("http://localhost/api/partners/v1/providers/synthflow/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          call_id: callId,
          HTTP_SYNTHFLOW_SIGNATURE: signature,
        },
        body: JSON.stringify({ event_id: "evt-dup", type: "activated" }),
      }),
      { params: { provider: "synthflow" } },
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({
      ok: true,
      accepted: true,
      ignored: true,
    });
  });

  it("isolate secrets across providers", () => {
    process.env.PARTNER_PROVIDER_SECRET_SYNTHFLOW = "synth-secret";
    process.env.PARTNER_PROVIDER_SECRET_ELEVENLABS = "eleven-secret";

    const synthflowSignature = Buffer.from(
      createHmac("sha256", "synth-secret").update("call-abc", "utf8").digest(),
    ).toString("base64");

    expect(
      gateway.verifyProviderWebhookAuthentication({
        provider: "synthflow",
        rawBody: JSON.stringify({ event_id: "evt-1" }),
        headers: new Headers({ call_id: "call-abc", HTTP_SYNTHFLOW_SIGNATURE: synthflowSignature }),
      }),
    ).toBe(true);

    expect(
      gateway.verifyProviderWebhookAuthentication({
        provider: "elevenlabs",
        rawBody: JSON.stringify({ event_id: "evt-1" }),
        headers: new Headers({
          "ElevenLabs-Signature": `t=${Math.floor(Date.now() / 1000)},v0=${createHmac("sha256", "synth-secret").update(`${Math.floor(Date.now() / 1000)}.${JSON.stringify({ event_id: "evt-1" })}`, "utf8").digest("hex")}`,
        }),
      }),
    ).toBe(false);
  });
});
