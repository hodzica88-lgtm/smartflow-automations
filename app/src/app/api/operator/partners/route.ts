import { NextResponse } from "next/server";

import { isPrimaryOwnerOperatorAccount } from "@/features/auth/primary-account";
import { createPartner } from "@/features/partners/management";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { loadServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status });

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

  return { authorized: true, user };
};

const parseJsonBody = async (request: Request) => {
  try {
    const parsed = await request.json();
    return parsed;
  } catch {
    return null;
  }
};

export async function POST(request: Request) {
  const env = loadServerEnv();

  if (!env.partnerMeteringEnabled) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const auth = await isAuthorizedPrimaryOwner();
  if (!auth.authorized) {
    return jsonResponse({ error: auth.reason }, auth.reason === "unauthorized" ? 401 : 403);
  }

  const payload = await parseJsonBody(request);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const allowedKeys = new Set([
    "name",
    "partner_key",
    "billing_model",
    "price_per_customer_minor",
    "currency",
  ]);

  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  try {
    const partner = await createPartner({
      name: String((payload as Record<string, unknown>).name ?? ""),
      partnerKey: String((payload as Record<string, unknown>).partner_key ?? ""),
      billingModel: String((payload as Record<string, unknown>).billing_model ?? "") as never,
      pricePerCustomerMinor: (payload as Record<string, unknown>).price_per_customer_minor as number | null | undefined,
      currency: String((payload as Record<string, unknown>).currency ?? ""),
    });

    return jsonResponse({ ok: true, partner }, 201);
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
}
