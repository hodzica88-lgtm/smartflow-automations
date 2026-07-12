const CACHE_NAME = "varnito-push-v1";
const PUSH_DEFAULT_TITLE = "Neue Varnito-Anfrage";
const PUSH_DEFAULT_BODY = "Eine neue Anfrage wartet auf Bearbeitung.";
const PUSH_FALLBACK_URL = "/dashboard";

const isAllowedLeadDetailsPath = (value) => /^\/dashboard\/leads\/[^/]+$/.test(value);

const isAllowedInternalPushPath = (value) =>
  typeof value === "string" && (value === "/dashboard" || isAllowedLeadDetailsPath(value));

const resolveAllowedInternalPushUrl = (value) => {
  let resolved;

  try {
    resolved = new URL(value, self.location.origin);
  } catch {
    return null;
  }

  if (resolved.origin !== self.location.origin || !isAllowedInternalPushPath(resolved.pathname)) {
    return null;
  }

  return resolved.toString();
};

const parsePayload = (raw) => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
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

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key.startsWith("varnito-push-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("push", (event) => {
  const payload = parsePayload(event.data ? event.data.text() : null);
  const title = payload?.title || PUSH_DEFAULT_TITLE;
  const body = payload?.body || PUSH_DEFAULT_BODY;
  const url = resolveAllowedInternalPushUrl(payload?.url || PUSH_FALLBACK_URL) || new URL(PUSH_FALLBACK_URL, self.location.origin).toString();
  const tag = payload?.leadId ? `lead-${payload.leadId}` : undefined;
  const notificationOptions = {
    body,
    renotify: false,
    data: {
      url,
    },
  };

  if (tag) {
    notificationOptions.tag = tag;
  }

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const notificationUrl =
        event.notification.data && typeof event.notification.data.url === "string"
          ? resolveAllowedInternalPushUrl(event.notification.data.url)
          : null;
      const targetUrl = notificationUrl || new URL(PUSH_FALLBACK_URL, self.location.origin).toString();
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      for (const client of allClients) {
        if ("focus" in client) {
          try {
            const clientUrl = new URL(client.url);
            const target = new URL(targetUrl);

            if (clientUrl.origin === target.origin && clientUrl.pathname === target.pathname) {
              return client.focus();
            }
          } catch {
            // Ignore malformed client URLs.
          }
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })(),
  );
});
