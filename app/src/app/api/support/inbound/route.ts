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

export async function POST(request: Request) {
  const env = loadServerEnv();
  const headerSecret = getHeaderValue(request, "x-support-secret") ?? getHeaderValue(request, "x-varnito-support-secret");

  if (env.supportWebhookSecret && headerSecret !== env.supportWebhookSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await parseInboundPayload(request);
  const senderEmail = String((payload.from as string | undefined) ?? (payload.sender_email as string | undefined) ?? "");
  const senderName = typeof payload.from_name === "string" ? payload.from_name : undefined;
  const subject = typeof payload.subject === "string" ? payload.subject : undefined;
  const body = typeof payload.text === "string" ? payload.text : typeof payload.body === "string" ? payload.body : "";
  const providerMessageId = typeof payload.message_id === "string" ? payload.message_id : typeof payload.id === "string" ? payload.id : undefined;
  const market = (typeof payload.market === "string" && (payload.market === "de" || payload.market === "us")) ? payload.market : "de";

  if (!senderEmail || !body) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const result = await processInboundSupportMessage({
    senderEmail,
    senderName,
    subject,
    body,
    providerMessageId,
    market,
    ipAddress: getHeaderValue(request, "x-forwarded-for") ?? getHeaderValue(request, "x-real-ip") ?? undefined,
  });

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
