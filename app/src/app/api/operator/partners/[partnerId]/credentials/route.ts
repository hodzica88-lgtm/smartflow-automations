import { NextResponse } from "next/server";

import { isPrimaryOwnerOperatorAccount } from "@/features/auth/primary-account";
import { issuePartnerCredential, listPartnerCredentials } from "@/features/partners/management";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { loadServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status });

const getRouteParams = async (params: Promise<{ partnerId: string }> | { partnerId: string }) => {
  const resolved = await Promise.resolve(params);
  return resolved.partnerId;
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ partnerId: string }> | { partnerId: string } },
) {
  const env = loadServerEnv();
  if (!env.partnerMeteringEnabled) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const auth = await isAuthorizedPrimaryOwner();
  if (!auth.authorized) {
    return jsonResponse({ error: auth.reason }, auth.reason === "unauthorized" ? 401 : 403);
  }

  const partnerId = await getRouteParams(context.params);
  if (!partnerId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(partnerId)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  try {
    const credentials = await listPartnerCredentials(partnerId);
    return jsonResponse({ ok: true, credentials }, 200);
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ partnerId: string }> | { partnerId: string } },
) {
  const env = loadServerEnv();
  if (!env.partnerMeteringEnabled) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const auth = await isAuthorizedPrimaryOwner();
  if (!auth.authorized) {
    return jsonResponse({ error: auth.reason }, auth.reason === "unauthorized" ? 401 : 403);
  }

  const partnerId = await getRouteParams(context.params);
  if (!partnerId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(partnerId)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  try {
    const result = await issuePartnerCredential(partnerId);
    return jsonResponse({
      ok: true,
      credential: result.credential,
      keyId: result.keyId,
      credentialId: result.credentialId,
      createdAt: result.createdAt,
      warning: "This credential will only be shown once.",
    }, 201);
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
}
