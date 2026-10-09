import { NextResponse } from "next/server";

import {
  createPublicInquiryLead,
  enforcePublicSuggestionRateLimit,
  FALLBACK_INQUIRY_TYPE,
  inferInquiryTypeSuggestion,
  MAX_PUBLIC_REQUEST_BODY_BYTES,
  validatePublicInquiryActionRequest,
} from "@/features/inquiry-assistant/service";
import { getActiveCompanyInquiryTypes } from "@/features/inquiry-types/service";
import { trackAnalyticsEvent } from "@/features/analytics/events";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import { getRequestMarket } from "@/shared/i18n/request";

export const runtime = "nodejs";

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function POST(request: Request) {
  let rawBodyText = "";
  try {
    rawBodyText = await request.clone().text();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const bodySizeBytes = new TextEncoder().encode(rawBodyText).length;
  if (bodySizeBytes > MAX_PUBLIC_REQUEST_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Anfrage zu groß." }, { status: 413 });
  }

  let body: Record<string, unknown> = {};
  if (rawBodyText.trim()) {
    try {
      const parsed = JSON.parse(rawBodyText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
    }
  }

  const actionInput = typeof body?.action === "string" ? body.action : "submit";
  const companyId = readString(body?.companyId);
  const sanitizedDescription = readString(body?.description);

  const validatedRequest = validatePublicInquiryActionRequest({
    action: actionInput,
    companyId,
    description: sanitizedDescription,
    payloadSizeBytes: bodySizeBytes,
  });

  if (!validatedRequest.ok) {
    return NextResponse.json({ ok: false, error: validatedRequest.error }, { status: validatedRequest.status });
  }

  const safeCompanyId = validatedRequest.companyId;
  const action = validatedRequest.action;
  const supabase = createSupabaseServiceRoleClient();
  const activeInquiryTypes = await getActiveCompanyInquiryTypes({ supabase, companyId: safeCompanyId });
  const safeAllowedTypes = activeInquiryTypes.length > 0
    ? activeInquiryTypes.map((entry) => entry.name)
    : [FALLBACK_INQUIRY_TYPE];

  if (action === "track-start") {
    let market: "de" | "us" | "unknown" = "unknown";
    try {
      market = (await getRequestMarket()).market;
    } catch {
      // Keep analytics anonymous if request context is unavailable.
    }

    trackAnalyticsEvent({
      eventName: "inquiry_chat_started",
      market,
      companyId: safeCompanyId,
      isAuthenticated: false,
      metadata: {
        inquiryType: safeAllowedTypes[0] ?? FALLBACK_INQUIRY_TYPE,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "track-fallback-form") {
    let market: "de" | "us" | "unknown" = "unknown";
    try {
      market = (await getRequestMarket()).market;
    } catch {
      // Keep analytics anonymous if request context is unavailable.
    }

    trackAnalyticsEvent({
      eventName: "inquiry_chat_fallback_form",
      market,
      companyId: safeCompanyId,
      isAuthenticated: false,
      metadata: {
        inquiryType: safeAllowedTypes[0] ?? FALLBACK_INQUIRY_TYPE,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "suggest-type") {
    const description = readString(body?.description);
    if (!description) {
      return NextResponse.json({ ok: false, error: "Bitte beschreiben Sie Ihr Anliegen." }, { status: 400 });
    }

    const rateLimit = await enforcePublicSuggestionRateLimit({ companyId: safeCompanyId });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Zu viele Vorschau-Anfragen in kurzer Zeit. Bitte versuchen Sie es später erneut." },
        { status: 429 },
      );
    }

    const requestMarket = (await getRequestMarket().catch(() => ({ market: "de" as const }))).market;
    const suggestion = await inferInquiryTypeSuggestion({
      description,
      allowedInquiryTypes: safeAllowedTypes,
      market: requestMarket,
    });

    return NextResponse.json({ ok: true, ...suggestion });
  }

  if (action === "submit") {
    const source = body?.source === "public_form" ? "public_form" : "public_ai_chat";
    const result = await createPublicInquiryLead({
      companyId: safeCompanyId,
      firstName: readString(body?.firstName),
      lastName: readString(body?.lastName),
      address: readString(body?.address),
      phone: readString(body?.phone),
      email: readString(body?.email),
      inquiryType: readString(body?.inquiryType),
      description: readString(body?.description || body?.notes || "") || null,
      website: readString(body?.website),
      allowedInquiryTypes: safeAllowedTypes,
      source,
      turnCount: typeof body?.turnCount === "number" ? body.turnCount : undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, leadId: result.leadId, source });
  }

  return NextResponse.json({ ok: false, error: "Unbekannte Anfrage." }, { status: 400 });
}
