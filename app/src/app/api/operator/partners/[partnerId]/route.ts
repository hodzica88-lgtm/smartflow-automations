import { NextResponse } from "next/server";

import { isPrimaryOwnerOperatorAccount } from "@/features/auth/primary-account";
import { updatePartner } from "@/features/partners/management";
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

const parseJsonBody = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export async function PATCH(
  request: Request,
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

  const payload = await parseJsonBody(request);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const allowedKeys = new Set([
    "status",
    "billing_model",
    "price_per_customer_minor",
    "currency",
  ]);

  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  try {
    const partner = await updatePartner({
      partnerId,
      status: typeof (payload as Record<string, unknown>).status === "string" ? (payload as Record<string, unknown>).status as never : undefined,
      billingModel: typeof (payload as Record<string, unknown>).billing_model === "string" ? ((payload as Record<string, unknown>).billing_model as string) as never : undefined,
      pricePerCustomerMinor: (payload as Record<string, unknown>).price_per_customer_minor as number | null | undefined,
      currency: typeof (payload as Record<string, unknown>).currency === "string" ? String((payload as Record<string, unknown>).currency) : undefined,
    });

    return jsonResponse({ ok: true, partner }, 200);
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
}
