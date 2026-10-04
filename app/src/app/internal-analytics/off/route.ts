import { NextResponse } from "next/server";

import {
  INTERNAL_ANALYTICS_COOKIE_NAME,
  INTERNAL_ANALYTICS_COOKIE_OPTIONS,
} from "@/features/analytics/internal-traffic";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(INTERNAL_ANALYTICS_COOKIE_NAME, "1", INTERNAL_ANALYTICS_COOKIE_OPTIONS);
  return response;
}
