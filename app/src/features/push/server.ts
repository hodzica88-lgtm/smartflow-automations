import webpush from "web-push";

import { loadServerEnv, publicEnv } from "@/shared/config/env";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import {
  buildLeadPushPayload,
  buildTestPushPayload,
  isAllowedInternalPushPath,
  resolveAllowedInternalPushUrl,
} from "./shared";

export type PushSubscriptionRow = {
  id: string;
  company_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  device_name: string | null;
  is_active: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_count: number;
};

export type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const isValidPushSubject = (value: string | undefined) => {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("mailto:")) {
    return trimmed.length > "mailto:".length;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

let webPushConfigured = false;

const configureWebPush = () => {
  if (webPushConfigured) {
    return;
  }

  const serverEnv = loadServerEnv();
  const publicKey = publicEnv.vapidPublicKey?.trim();
  const privateKey = serverEnv.vapidPrivateKey?.trim();
  const subject = serverEnv.vapidSubject?.trim();

  if (!publicKey || !privateKey || !subject || !isValidPushSubject(subject)) {
    throw new Error("Push-Benachrichtigungen sind nicht konfiguriert.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  webPushConfigured = true;
};

export const hasPushConfiguration = () => {
  const serverEnv = loadServerEnv();

  return Boolean(
    publicEnv.vapidPublicKey?.trim() &&
      serverEnv.vapidPrivateKey?.trim() &&
      isValidPushSubject(serverEnv.vapidSubject),
  );
};

export const toPushSubscriptionPayload = (
  subscription: PushSubscription,
): PushSubscriptionPayload => subscription.toJSON() as PushSubscriptionPayload;

export const sendPushToSubscription = async (
  subscription: Pick<PushSubscriptionPayload, "endpoint" | "keys">,
  payload: ReturnType<typeof buildLeadPushPayload> | ReturnType<typeof buildTestPushPayload>,
) => {
  configureWebPush();

  const resolvedUrl = resolveAllowedInternalPushUrl(payload.url, publicEnv.appUrl);
  if (!resolvedUrl) {
    throw new Error("Ungültige interne Ziel-URL.");
  }

  const leadId =
    typeof payload.leadId === "string" && payload.leadId.trim().length > 0
      ? payload.leadId.trim()
      : undefined;

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    },
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: resolvedUrl,
      ...(leadId ? { leadId } : {}),
    }),
    { TTL: 60 },
  );
};

const classifyWebPushErrorStatus = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const statusCode = Reflect.get(error, "statusCode");
  return typeof statusCode === "number" ? statusCode : null;
};

const isTerminalSubscriptionStatus = (statusCode: number | null) =>
  statusCode === 404 || statusCode === 410;

const updateSubscriptionAfterSuccess = async (subscriptionId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  await supabase
    .from("push_subscriptions")
    .update({
      last_success_at: now,
      last_failure_at: null,
      failure_count: 0,
      is_active: true,
      updated_at: now,
    })
    .eq("id", subscriptionId);
};

const updateSubscriptionAfterFailure = async (
  subscriptionId: string,
  statusCode: number | null,
) => {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.rpc("increment_push_subscription_failure", {
    p_subscription_id: subscriptionId,
    p_status_code: statusCode,
  });

  if (error) {
    throw error;
  }
};

export const sendLeadPushNotificationsForCompany = async ({
  companyId,
  leadId,
}: {
  companyId: string;
  leadId: string;
}) => {
  if (!hasPushConfiguration()) {
    return { delivered: 0, failed: 0, deactivated: 0, skipped: true };
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  const payload = buildLeadPushPayload(leadId);
  let delivered = 0;
  let failed = 0;
  let deactivated = 0;

  for (const subscription of subscriptions ?? []) {
    try {
      await sendPushToSubscription(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload,
      );

      await updateSubscriptionAfterSuccess(subscription.id);
      delivered += 1;
    } catch (error) {
      const statusCode = classifyWebPushErrorStatus(error);
      failed += 1;

      if (isTerminalSubscriptionStatus(statusCode)) {
        deactivated += 1;
      }

      await updateSubscriptionAfterFailure(subscription.id, statusCode);

      const message = error instanceof Error ? error.message : "Unbekannter Push-Fehler";
      console.warn("Push-Benachrichtigung fehlgeschlagen", {
        companyId,
        leadId,
        statusCode,
        message,
      });
    }
  }

  return { delivered, failed, deactivated, skipped: false };
};

export const markPushSubscriptionDelivered = async (subscriptionId: string) => {
  await updateSubscriptionAfterSuccess(subscriptionId);
};

export const markPushSubscriptionFailed = async (
  subscriptionId: string,
  statusCode: number | null,
) => {
  await updateSubscriptionAfterFailure(subscriptionId, statusCode);
};

export const sendTestPushNotification = async ({
  endpoint,
  p256dh,
  auth,
}: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) => {
  if (!hasPushConfiguration()) {
    throw new Error("Push-Benachrichtigungen sind nicht konfiguriert.");
  }

  await sendPushToSubscription(
    {
      endpoint,
      keys: {
        p256dh,
        auth,
      },
    },
    buildTestPushPayload(),
  );
};

export const classifyPushErrorStatus = classifyWebPushErrorStatus;
export const isPushPathAllowed = isAllowedInternalPushPath;
