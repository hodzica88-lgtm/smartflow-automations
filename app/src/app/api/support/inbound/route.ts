import { NextResponse } from "next/server";

import { processInboundSupportMessage } from "@/features/support/service";
import { loadServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";

const getHeaderValue = (request: Request, key: string) => {
  const value = request.headers.get(key);
  return value && value.trim().length > 0 ? value.trim() : null;
};

const parseInboundPayload = async (request: Request) => {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, unknown>;
  }

  const raw = await request.text();
  if (!raw) {
    return {} as Record<string, unknown>;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
};

const readString = (value: unknown) => (typeof value === "string" ? value : undefined);

const normalizeBrevoItem = (item: unknown) => {
  const record = typeof item === "object" && item ? (item as Record<string, unknown>) : {};

  const from = (record.From ?? record.from) as Record<string, unknown> | string | undefined;
  const senderEmail = typeof from === "string"
    ? from
    : typeof from === "object" && from
      ? readString((from as Record<string, unknown>).Address ?? (from as Record<string, unknown>).address)
      : readString(record.sender_email ?? record.senderEmail ?? record.from);

  const senderName = typeof from === "object" && from
    ? readString((from as Record<string, unknown>).Name ?? (from as Record<string, unknown>).name)
    : readString(record.from_name ?? record.fromName);

  const subject = readString(record.Subject ?? record.subject);
  const body =
    readString(record.ExtractedMarkdownMessage ?? record.extractedMarkdownMessage)
    ?? readString(record.RawTextBody ?? record.rawTextBody)
    ?? readString(record.text)
    ?? readString(record.body)
    ?? "";

  const providerMessageId =
    readString(record.MessageId ?? record.message_id ?? record.id)
    ?? readString(record.messageId);

  return {
    senderEmail: senderEmail ?? "",
    senderName,
    subject,
    body,
    providerMessageId,
  };
};

export const normalizeSupportInboundItems = (payload: Record<string, unknown>) => {
  const rawItems = Array.isArray(payload.items) ? payload.items : [payload];

  return rawItems.flatMap((item) => {
    const normalized = normalizeBrevoItem(item);
    if (!normalized.senderEmail || !normalized.body) {
      return [];
    }

    return [{
      senderEmail: normalized.senderEmail,
      senderName: normalized.senderName,
      subject: normalized.subject,
      body: normalized.body,
      providerMessageId: normalized.providerMessageId,
    }];
  });
};

export async function POST(request: Request) {
  const env = loadServerEnv();
  const headerSecret = getHeaderValue(request, "x-support-secret") ?? getHeaderValue(request, "x-varnito-support-secret");

  if (env.supportWebhookSecret && headerSecret !== env.supportWebhookSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await parseInboundPayload(request);
  const normalizedItems = normalizeSupportInboundItems(payload);
  if (normalizedItems.length === 0) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const market = (typeof payload.market === "string" && (payload.market === "de" || payload.market === "us")) ? payload.market : "de";
  const ipAddress = getHeaderValue(request, "x-forwarded-for") ?? getHeaderValue(request, "x-real-ip") ?? undefined;

  if (normalizedItems.length === 1) {
    const item = normalizedItems[0];
    const result = await processInboundSupportMessage({
      senderEmail: item.senderEmail,
      senderName: item.senderName,
      subject: item.subject,
      body: item.body,
      providerMessageId: item.providerMessageId,
      market,
      ipAddress,
    });

    if (result.persistError) {
      return NextResponse.json({ error: "persistence_failed" }, { status: 500 });
    }

    if (result.duplicate) {
      return NextResponse.json({ status: "duplicate" }, { status: 200 });
    }

    if (result.loop) {
      return NextResponse.json({ status: "ignored_loop" }, { status: 200 });
    }

    return NextResponse.json({
      status: "processed",
      threadId: result.threadId,
      duplicate: result.duplicate,
      created: result.created,
    }, { status: 200 });
  }

  const results = await Promise.all(normalizedItems.map(async (item) => {
    const result = await processInboundSupportMessage({
      senderEmail: item.senderEmail,
      senderName: item.senderName,
      subject: item.subject,
      body: item.body,
      providerMessageId: item.providerMessageId,
      market,
      ipAddress,
    });

    return {
      senderEmail: item.senderEmail,
      status: result.persistError ? "persistence_failed" : (result.duplicate ? "duplicate" : result.loop ? "ignored_loop" : "processed"),
      threadId: result.threadId,
      created: result.created,
      persistError: result.persistError,
    };
  }));

  if (results.some((item) => item.persistError)) {
    return NextResponse.json({ error: "persistence_failed", items: results }, { status: 500 });
  }

  return NextResponse.json({
    status: "processed",
    processedCount: results.length,
    items: results,
  }, { status: 200 });
}
