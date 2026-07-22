import { NextResponse, type NextRequest } from "next/server";

import { getSafePostLoginPath } from "@/features/auth/redirects";
import { createSupabaseMiddlewareClient } from "@/shared/lib/supabase/middleware";

const protectedRoutePrefixes = ["/dashboard", "/onboarding", "/operator"];

const isProtectedRoute = (pathname: string) =>
  protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, supabase } = createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && user) {
    const nextPath = getSafePostLoginPath(request.nextUrl.searchParams.get("next"));
    const destinationUrl = request.nextUrl.clone();
    destinationUrl.pathname = nextPath ?? "/dashboard";
    destinationUrl.search = "";

    return NextResponse.redirect(destinationUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/operator/:path*", "/login"],
};
