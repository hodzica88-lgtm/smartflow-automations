import { NextResponse, type NextRequest } from "next/server";

import { ensureUserProfile } from "@/features/auth/profile";
import {
  resolveAuthRedirectBase,
  sanitizeRegistrationSource,
} from "@/features/auth/registration";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export const runtime = "nodejs";

const CONFIRMATION_OTP_TYPES = new Set(["signup", "email"]);

export async function GET(request: NextRequest) {
  const { market, config, host } = await getRequestMarket();
  const base = resolveAuthRedirectBase(host, config.siteUrl);
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const source = sanitizeRegistrationSource(params.get("source"));
  const supabase = await createSupabaseServerClient();

  const failureUrl = new URL("/login", base);
  failureUrl.searchParams.set(
    "error",
    getMarketCopy(market).shared.auth.errors.confirmationLinkInvalid,
  );

  let user = null;

  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      user = error ? null : data.user;
    } else if (tokenHash && type && CONFIRMATION_OTP_TYPES.has(type)) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "signup" | "email",
      });
      user = error ? null : data.user;
    }
  } catch {
    user = null;
  }

  if (!user) {
    return NextResponse.redirect(failureUrl);
  }

  try {
    await ensureUserProfile(user);
  } catch {
    await supabase.auth.signOut();
    return NextResponse.redirect(failureUrl);
  }

  // The onboarding page routes owners, invited members and operators to the right place.
  const destination = new URL("/onboarding", base);

  if (source) {
    destination.searchParams.set("source", source);
  }

  return NextResponse.redirect(destination);
}
