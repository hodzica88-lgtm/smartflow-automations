import { NextResponse, type NextRequest } from "next/server";

import { resolveAuthRedirectBase } from "@/features/auth/registration";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { market, config, host } = await getRequestMarket();
  const base = resolveAuthRedirectBase(host, config.siteUrl);
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const supabase = await createSupabaseServerClient();

  const failureUrl = new URL("/forgot-password", base);
  failureUrl.searchParams.set("error", getMarketCopy(market).shared.auth.errors.resetLinkInvalid);

  let valid = false;

  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      valid = !error && Boolean(data.session);
    } else if (tokenHash && type === "recovery") {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });
      valid = !error && Boolean(data.session);
    }
  } catch {
    valid = false;
  }

  // The destination is fixed; no caller-supplied redirect target is ever used.
  return NextResponse.redirect(valid ? new URL("/reset-password", base) : failureUrl);
}
