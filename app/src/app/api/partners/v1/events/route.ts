import { NextResponse } from "next/server";

import { verifyPartnerApiCredential } from "@/features/partners/credentials";
import {
  applyPartnerEvent,
  PartnerEventConflictError,
} from "@/features/partners/service";
import { PARTNER_EVENT_TYPES } from "@/features/partners/types";
import { loadServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8192;
const INVALID_REQUEST = "invalid_request";
const UNAUTHORIZED = "unauthorized";
const FORBIDDEN = "forbidden";
const CONFLICT = "conflict";
const SERVER_ERROR = "server_error";

const jsonResponse = (body: object, status: number) =>
  NextResponse.json(body, { status });

const getAuthorizationToken = (request: Request) => {
  const headerValue = request.headers.get("authorization");

  if (!headerValue) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return match ? match[1].trim() : null;
};

const parseRequestBody = async (request: Request) => {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const parsedLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(parsedLength) && parsedLength > MAX_BODY_BYTES) {
      return { error: INVALID_REQUEST };
    }
  }

  const rawBody = await request.text();
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return { error: INVALID_REQUEST };
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: INVALID_REQUEST };
    }

    return { payload: parsed as Record<string, unknown> };
  } catch {
    return { error: INVALID_REQUEST };
  }
};

const normalizeIsoDate = (value: unknown) => {
  if (value === undefined) {
    return new Date().toISOString();
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("invalid_occurred_at");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("invalid_occurred_at");
  }

  return parsed.toISOString();
};

export async function POST(request: Request) {
  const env = loadServerEnv();

  if (!env.partnerMeteringEnabled) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const bearerToken = getAuthorizationToken(request);

  if (!bearerToken) {
    return jsonResponse({ error: UNAUTHORIZED }, 401);
  }

  const authResult = await verifyPartnerApiCredential(bearerToken);

  if (!authResult) {
    return jsonResponse({ error: UNAUTHORIZED }, 401);
  }

  if (authResult.status !== "active") {
    return jsonResponse({ error: FORBIDDEN }, 403);
  }

  const parsedBody = await parseRequestBody(request);
  if ("error" in parsedBody) {
    return jsonResponse({ error: INVALID_REQUEST }, 400);
  }

  const payload = parsedBody.payload;

  if ("partner_id" in payload) {
    return jsonResponse({ error: INVALID_REQUEST }, 400);
  }

  const allowedBodyKeys = new Set([
    "event_id",
    "external_customer_id",
    "event_type",
    "occurred_at",
  ]);

  if (Object.keys(payload).some((key) => !allowedBodyKeys.has(key))) {
    return jsonResponse({ error: INVALID_REQUEST }, 400);
  }

  const eventId = payload.event_id;
  const externalCustomerId = payload.external_customer_id;
  const eventType = payload.event_type;

  if (typeof eventId !== "string" || eventId.trim().length === 0 || eventId.length > 128) {
    return jsonResponse({ error: INVALID_REQUEST }, 400);
  }

  if (
    typeof externalCustomerId !== "string" ||
    externalCustomerId.trim().length === 0 ||
    externalCustomerId.length > 128
  ) {
    return jsonResponse({ error: INVALID_REQUEST }, 400);
  }

  if (typeof eventType !== "string" || !PARTNER_EVENT_TYPES.includes(eventType as (typeof PARTNER_EVENT_TYPES)[number])) {
    return jsonResponse({ error: INVALID_REQUEST }, 400);
  }

  let occurredAt: string;

  try {
    occurredAt = normalizeIsoDate(payload.occurred_at);
  } catch {
    return jsonResponse({ error: INVALID_REQUEST }, 400);
  }

  try {
    const result = await applyPartnerEvent({
      partnerId: authResult.partnerId,
      eventId: eventId.trim(),
      externalCustomerId: externalCustomerId.trim(),
      eventType: eventType as (typeof PARTNER_EVENT_TYPES)[number],
      occurredAt,
    });

    return jsonResponse({ ok: true, duplicate: result.duplicate }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");

    if (
      error instanceof PartnerEventConflictError ||
      /idempotency conflict/i.test(message)
    ) {
      return jsonResponse({ ok: false, error: CONFLICT }, 409);
    }

    return jsonResponse({ ok: false, error: SERVER_ERROR }, 500);
  }
}
