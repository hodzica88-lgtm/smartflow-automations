import { NextResponse } from "next/server";

import { isPrimaryOwnerOperatorAccount } from "@/features/auth/primary-account";
import { revokePartnerCredential } from "@/features/partners/management";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { loadServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status });

const isValidUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);

const getRouteParams = async (
  params: Promise<{ partnerId: string; credentialId: string }> | { partnerId: string; credentialId: string },
) => {
  const resolved = await Promise.resolve(params);
  return { partnerId: resolved.partnerId, credentialId: resolved.credentialId };
};

const isAuthorizedPrimaryOwner = async () => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { authorized: false, reason: "unauthorized" as const };
  }

  if (!isPrimaryOwnerOperatorAccount(user.email)) {
    return { authorized: false, reason: "forbidden" as const };
  }

  return { authorized: true };
};

export async function POST(
  _request: Request,
  context: { params: Promise<{ partnerId: string; credentialId: string }> | { partnerId: string; credentialId: string } },
) {
  const env = loadServerEnv();
  if (!env.partnerMeteringEnabled) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const auth = await isAuthorizedPrimaryOwner();
  if (!auth.authorized) {
    return jsonResponse({ error: auth.reason }, auth.reason === "unauthorized" ? 401 : 403);
  }

  const { partnerId, credentialId } = await getRouteParams(context.params);

  if (!partnerId || !isValidUuid(partnerId)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  if (!credentialId || !isValidUuid(credentialId)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  try {
    await revokePartnerCredential({ partnerId, credentialId });
    return jsonResponse({ ok: true }, 200);
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
}
