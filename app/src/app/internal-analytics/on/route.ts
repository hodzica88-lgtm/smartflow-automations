import { NextResponse } from "next/server";

import { INTERNAL_ANALYTICS_COOKIE_NAME } from "@/features/analytics/internal-traffic";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));

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
