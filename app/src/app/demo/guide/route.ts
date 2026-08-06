import { NextResponse } from "next/server";

import { resolveGuideResponse } from "@/features/demo/guide";
import { resolveMarketFromHost } from "@/shared/i18n/market";

const isAllowedDemoPath = (value: string) =>
  value === "/demo/dashboard" ||
  value === "/demo/leads" ||
  value === "/demo/team" ||
  value === "/demo/billing" ||
  value === "/demo/settings";

export function GET(request: Request) {
  const url = new URL(request.url);
  const question = (url.searchParams.get("q") ?? "").trim();
  const returnToRaw = (url.searchParams.get("returnTo") ?? "/demo/dashboard").trim();
  const returnTo = isAllowedDemoPath(returnToRaw) ? returnToRaw : "/demo/dashboard";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const market = resolveMarketFromHost(host);
  const response = resolveGuideResponse(market, question);

  if (response.route) {
    const target = response.highlight
      ? `${response.route}?highlight=${encodeURIComponent(response.highlight)}`
      : response.route;
    return NextResponse.redirect(new URL(target, url));
  }

  const fallback = new URL(returnTo, url);
  fallback.searchParams.set("guide", response.answer);
  return NextResponse.redirect(fallback);
}