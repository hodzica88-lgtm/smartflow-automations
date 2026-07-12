import { NextResponse } from "next/server";

import { getUserCompanyState } from "@/features/onboarding/company";
import { classifyPushErrorStatus, markPushSubscriptionDelivered, markPushSubscriptionFailed, sendTestPushNotification } from "@/features/push/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export const runtime = "nodejs";

const jsonResponse = (body: object, status: number) => NextResponse.json(body, { status });

const getAuthenticatedUser = async () => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  return user ?? null;
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

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";

  if (!endpoint) {
    return jsonResponse({ ok: false, message: "Ungültiges Push-Abonnement." }, 400);
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: subscription, error } = await supabase
    .from("push_subscriptions")
    .select("id, company_id, user_id, endpoint, p256dh, auth, is_active")
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (error) {
    return jsonResponse({ ok: false, message: "Push-Test konnte nicht vorbereitet werden." }, 500);
  }

  if (
    !subscription ||
    subscription.company_id !== companyState.companyId ||
    subscription.user_id !== user.id ||
    !subscription.is_active
  ) {
    return jsonResponse({ ok: false, message: "Push-Abonnement nicht gefunden." }, 404);
  }

  try {
    await sendTestPushNotification({
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    });

    await markPushSubscriptionDelivered(subscription.id);

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    const statusCode = classifyPushErrorStatus(error);
    await markPushSubscriptionFailed(subscription.id, statusCode);

    if (statusCode === 404 || statusCode === 410) {
      return jsonResponse({ ok: false, message: "Dieses Gerät konnte nicht mehr erreicht werden." }, 410);
    }

    return jsonResponse({ ok: false, message: "Testbenachrichtigung konnte nicht gesendet werden." }, 503);
  }
}
