import { NextResponse, type NextRequest } from "next/server";

import { getDefaultPostLoginPath, getSafePostLoginPath } from "@/features/auth/redirects";
import { createSupabaseMiddlewareClient } from "@/shared/lib/supabase/middleware";

const protectedRoutePrefixes = ["/dashboard", "/onboarding", "/operator"];

const isProtectedRoute = (pathname: string) =>
  protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, supabase } = createSupabaseMiddlewareClient(request);

  if (isProtectedRoute(pathname)) {
    const {
      data: { claims },
    } = await supabase.auth.getClaims();

    if (!claims?.sub) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);

      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  if (pathname === "/login") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const nextPath = getSafePostLoginPath(request.nextUrl.searchParams.get("next"));
      const destinationUrl = request.nextUrl.clone();
      const destination = nextPath?.startsWith("/operator")
        ? nextPath
        : getDefaultPostLoginPath(user);
      destinationUrl.pathname = destination;
      destinationUrl.search = "";

      return NextResponse.redirect(destinationUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/operator/:path*", "/login"],
};
