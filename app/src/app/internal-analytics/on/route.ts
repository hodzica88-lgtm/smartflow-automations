import { NextResponse } from "next/server";

import { INTERNAL_ANALYTICS_COOKIE_NAME } from "@/features/analytics/internal-traffic";
import { normalizeHostForMarket, resolveMarketFromHost } from "@/shared/i18n/market";

const resolveInternalAnalyticsRedirectTarget = (request: Request) => {
  const hostHeader = request.headers.get("x-forwarded-host")
    ?? request.headers.get("x-original-host")
    ?? request.headers.get("host")
    ?? new URL(request.url).host;

  const normalizedHost = normalizeHostForMarket(hostHeader);
  const forwardedProtocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(/:$/, "");
  const portSuffix = hostHeader.includes(":") ? `:${hostHeader.split(":").at(-1)}` : "";

  if (normalizedHost === "localhost" || normalizedHost === "127.0.0.1") {
    return `${forwardedProtocol}://${normalizedHost}${portSuffix}/`;
  }

  if (normalizedHost === "us.localhost") {
    return `${forwardedProtocol}://us.localhost${portSuffix}/`;
  }

  const market = resolveMarketFromHost(hostHeader);
  return `${market === "us" ? "https://varnito.com" : "https://varnito.de"}/`;
};

export async function GET(request: Request) {
  const response = NextResponse.redirect(resolveInternalAnalyticsRedirectTarget(request));

  response.cookies.set(INTERNAL_ANALYTICS_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
