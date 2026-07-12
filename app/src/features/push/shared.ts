export type PushNotificationPayload = {
  title: string;
  body: string;
  url: string;
  leadId?: string;
};

export const PUSH_LEAD_TITLE = "Neue Varnito-Anfrage";
export const PUSH_LEAD_BODY = "Eine neue Anfrage wartet auf Bearbeitung.";
export const PUSH_TEST_TITLE = "Varnito-Testbenachrichtigung";
export const PUSH_TEST_BODY = "Push-Benachrichtigungen sind aktiv.";
export const PUSH_CACHE_NAME = "varnito-push-v1";

const isAllowedLeadDetailsPath = (value: string) => /^\/dashboard\/leads\/[^/]+$/.test(value);

export const isAllowedInternalPushPath = (value: string) =>
  value === "/dashboard" || isAllowedLeadDetailsPath(value);

export const resolveAllowedInternalPushUrl = (value: string, origin: string) => {
  let url: URL;

  try {
    url = new URL(value, origin);
  } catch {
    return null;
  }

  if (url.origin !== origin || !isAllowedInternalPushPath(url.pathname)) {
    return null;
  }

  return url.toString();
};

export const buildLeadPushPayload = (leadId: string): PushNotificationPayload => ({
  title: PUSH_LEAD_TITLE,
  body: PUSH_LEAD_BODY,
  url: `/dashboard/leads/${leadId}`,
  leadId,
});

export const buildTestPushPayload = (): PushNotificationPayload => ({
  title: PUSH_TEST_TITLE,
  body: PUSH_TEST_BODY,
  url: "/dashboard",
});

export const parsePushPayload = (value: string | null | undefined): PushNotificationPayload | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PushNotificationPayload>;

    if (
      typeof parsed.title !== "string" ||
      typeof parsed.body !== "string" ||
      typeof parsed.url !== "string"
    ) {
      return null;
    }

    const title = parsed.title.trim();
    const body = parsed.body.trim();
    const url = parsed.url.trim();

    if (!title || !body || !url) {
      return null;
    }

    return {
      title,
      body,
      url,
      leadId:
        typeof parsed.leadId === "string" && parsed.leadId.trim().length > 0
          ? parsed.leadId.trim()
          : undefined,
    };
  } catch {
    return null;
  }
};

export const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};
