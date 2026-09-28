import { NextResponse } from "next/server";

import { answerSiteHelpRequest } from "@/features/site-help/service";
import { getRequestMarket } from "@/shared/i18n/request";
import { buildRateLimitedResponse, enforceActionRateLimit } from "@/shared/lib/rate-limit/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = await enforceActionRateLimit({
    scope: "site_help_public",
    maxSubmissions: 20,
    windowMinutes: 10,
  });

  if (!rateLimit.allowed) {
    return buildRateLimitedResponse(
      "Zu viele Anfragen. Bitte versuchen Sie es später erneut.",
      rateLimit.retryAfterSeconds,
    );
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const path = typeof body?.path === "string" ? body.path.trim() : "/";

  if (!message) {
    return NextResponse.json({ ok: false, error: "Bitte geben Sie eine Frage ein." }, { status: 400 });
  }

  const requestMarket = await getRequestMarket().catch(() => ({ market: "de" as const })).then((result) => result.market);
  const market = body?.market === "us" || body?.market === "de" ? body.market : requestMarket;

  const result = await answerSiteHelpRequest({ market, message, path });

  return NextResponse.json({ ok: true, result });
}
