import { NextResponse } from "next/server";

import {
  applyProviderLifecycleEvent,
  getProviderRegistryEntry,
  mapProviderLifecycleEvent,
  normalizeProviderEvent,
  verifyProviderWebhookAuthentication,
} from "@/features/partners/provider-gateway";
import { loadServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status });

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> | { provider: string } },
) {
  const env = loadServerEnv();

  if (!env.partnerMeteringEnabled || !env.partnerProviderGatewayEnabled) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const params = await context.params;
  const provider = params?.provider ?? "";
  const registryEntry = getProviderRegistryEntry(provider);

  if (!registryEntry) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  if (registryEntry.state === "CONTRACT_PENDING") {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const rawBody = await request.text();
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  if (!verifyProviderWebhookAuthentication({ provider: registryEntry.id, rawBody, headers: request.headers })) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let parsedBody: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    parsedBody = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const envelope = normalizeProviderEvent(registryEntry.id, parsedBody);
  const mapped = mapProviderLifecycleEvent(registryEntry.id, envelope);

  if (!mapped) {
    return jsonResponse({ ok: true, accepted: true, ignored: true }, 200);
  }

  if (!envelope.externalCustomerId || !envelope.externalCustomerId.trim()) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  try {
    const result = await applyProviderLifecycleEvent({
      provider: registryEntry.id,
      envelope,
      externalCustomerId: envelope.externalCustomerId.trim(),
      occurredAt: envelope.occurredAt,
    });

    if (result.ignored) {
      return jsonResponse({ ok: true, accepted: true, ignored: true }, 200);
    }

    if (result.conflict) {
      return jsonResponse({ ok: false, error: "conflict" }, 409);
    }

    return jsonResponse({ ok: true, accepted: true, duplicate: Boolean(result.duplicate) }, 200);
  } catch {
    return jsonResponse({ error: "server_error" }, 500);
  }
}