import { NextResponse } from "next/server";

import { getUserCompanyState } from "@/features/onboarding/company";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export const runtime = "nodejs";

const getAuthenticatedUser = async () => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  return user ?? null;
};

const jsonResponse = (body: object, status: number) => NextResponse.json(body, { status });

const MAX_ENDPOINT_LENGTH = 2048;
const MAX_KEY_LENGTH = 512;
const MAX_USER_AGENT_LENGTH = 1024;
const MAX_DEVICE_NAME_LENGTH = 120;

type NormalizedSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const isValidHttpsUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeOptionalText = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.length <= maxLength ? trimmed : null;
};

const normalizeSubscriptionPayload = (value: unknown): NormalizedSubscriptionPayload | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  if (typeof payload.keys !== "object" || payload.keys === null) {
    return null;
  }

  const endpoint = typeof payload.endpoint === "string" ? payload.endpoint.trim() : "";
  const p256dhRaw = (payload.keys as Record<string, unknown>).p256dh;
  const authRaw = (payload.keys as Record<string, unknown>).auth;
  const p256dh = typeof p256dhRaw === "string" ? p256dhRaw.trim() : "";
  const auth = typeof authRaw === "string" ? authRaw.trim() : "";

  if (!endpoint || endpoint.length > MAX_ENDPOINT_LENGTH || !isValidHttpsUrl(endpoint)) {
    return null;
  }

  if (!p256dh || p256dh.length > MAX_KEY_LENGTH || !auth || auth.length > MAX_KEY_LENGTH) {
    return null;
  }

  return {
    endpoint,
    keys: {
      p256dh,
      auth,
    },
  };
};

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonResponse({ ok: false, message: "Nicht angemeldet." }, 401);
  }

  const companyState = await getUserCompanyState(user.id);
  if (!companyState.companyId) {
    return jsonResponse({ ok: false, message: "Firma nicht gefunden." }, 403);
  }

  const body = (await request.json().catch(() => null)) as {
    subscription?: unknown;
    deviceName?: unknown;
    userAgent?: unknown;
  } | null;

  const normalizedSubscription = body ? normalizeSubscriptionPayload(body.subscription) : null;

  if (!body || !normalizedSubscription) {
    return jsonResponse({ ok: false, message: "Ungültiges Push-Abonnement." }, 400);
  }

  const subscription = normalizedSubscription;
  const userAgent = normalizeOptionalText(body.userAgent, MAX_USER_AGENT_LENGTH);
  const deviceName = normalizeOptionalText(body.deviceName, MAX_DEVICE_NAME_LENGTH);
  const supabase = createSupabaseServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from("push_subscriptions")
    .select("id, company_id, user_id")
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();

  if (existingError) {
    return jsonResponse({ ok: false, message: "Push-Abonnement konnte nicht gespeichert werden." }, 500);
  }

  if (existing && (existing.company_id !== companyState.companyId || existing.user_id !== user.id)) {
    return jsonResponse({ ok: false, message: "Push-Abonnement gehört zu einem anderen Konto." }, 409);
  }

  const payload = {
    company_id: companyState.companyId,
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: userAgent,
    device_name: deviceName,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = existing
    ? await supabase.from("push_subscriptions").update(payload).eq("id", existing.id)
    : await supabase.from("push_subscriptions").insert({ ...payload, failure_count: 0 });

  if (error) {
    return jsonResponse({ ok: false, message: "Push-Abonnement konnte nicht gespeichert werden." }, 500);
  }

  return jsonResponse({ ok: true }, 200);
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonResponse({ ok: false, message: "Nicht angemeldet." }, 401);
  }

  const companyState = await getUserCompanyState(user.id);
  if (!companyState.companyId) {
    return jsonResponse({ ok: false, message: "Firma nicht gefunden." }, 403);
  }

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";

  if (!endpoint || endpoint.length > MAX_ENDPOINT_LENGTH || !isValidHttpsUrl(endpoint)) {
    return jsonResponse({ ok: false, message: "Ungültiges Push-Abonnement." }, 400);
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: existing, error: existingError } = await supabase
    .from("push_subscriptions")
    .select("id, company_id, user_id")
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (existingError) {
    return jsonResponse({ ok: false, message: "Push-Abonnement konnte nicht deaktiviert werden." }, 500);
  }

  if (!existing || existing.company_id !== companyState.companyId || existing.user_id !== user.id) {
    return jsonResponse({ ok: false, message: "Push-Abonnement nicht gefunden." }, 404);
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (error) {
    return jsonResponse({ ok: false, message: "Push-Abonnement konnte nicht deaktiviert werden." }, 500);
  }

  return jsonResponse({ ok: true }, 200);
}
