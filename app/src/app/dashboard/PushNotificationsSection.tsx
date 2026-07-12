"use client";

import { useEffect, useState } from "react";

import { urlBase64ToUint8Array } from "@/features/push/shared";

const STATUS_LABELS = {
  supported: "aktiviert",
  blocked: "blockiert",
  inactive: "nicht aktiviert",
  unsupported: "nicht unterstützt",
} as const;

type PushStatus = keyof typeof STATUS_LABELS;

type PushNotificationsSectionProps = {
  vapidPublicKey: string | null;
  pushConfigured: boolean;
};

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "2.75rem",
  width: "fit-content",
  padding: "12px 18px",
  borderRadius: 8,
  background: "#3182ce",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  background: "#fff",
  color: "#1a202c",
  border: "1px solid #cbd5e0",
} as const;

const safeResponseMessage = (fallback: string) => fallback;

const getFriendlyDeviceName = () => {
  if (typeof navigator === "undefined") {
    return null;
  }

  return navigator.platform ?? navigator.userAgent ?? null;
};

export default function PushNotificationsSection({
  vapidPublicKey,
  pushConfigured,
}: PushNotificationsSectionProps) {
  const [status, setStatus] = useState<PushStatus>("unsupported");
  const [message, setMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsClient(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const supportedInBrowser =
    isClient &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    let cancelled = false;

    const refreshSubscriptionState = async () => {
      await Promise.resolve();

      if (!supportedInBrowser || !pushConfigured) {
        if (!cancelled) {
          setSubscription(null);
          setStatus("unsupported");
        }

        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) {
          setSubscription(null);
          setStatus("blocked");
        }

        return;
      }

      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const currentSubscription = registration ? await registration.pushManager.getSubscription() : null;

      if (!cancelled) {
        setSubscription(currentSubscription);
        setStatus(currentSubscription ? "supported" : "inactive");
      }
    };

    void refreshSubscriptionState().catch(() => {
      if (!cancelled) {
        setSubscription(null);
        setStatus("unsupported");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [supportedInBrowser, pushConfigured]);

  const ensureServiceWorker = async () => {
    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing) {
      return existing;
    }

    return navigator.serviceWorker.register("/sw.js", { scope: "/" });
  };

  const saveSubscription = async (currentSubscription: PushSubscription) => {
    const response = await fetch("/api/push/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscription: currentSubscription.toJSON(),
        deviceName: getFriendlyDeviceName(),
        userAgent: navigator.userAgent,
      }),
    });

    const data = (await response.json().catch(() => null)) as { message?: unknown } | null;

    if (!response.ok) {
      throw new Error(
        typeof data?.message === "string" && data.message.trim().length > 0
          ? data.message
          : "Push-Abonnement konnte nicht gespeichert werden.",
      );
    }
  };

  const activatePush = async () => {
    setIsBusy(true);
    setMessage(null);

    try {
      if (!supportedInBrowser || !pushConfigured || !vapidPublicKey) {
        setStatus("unsupported");
        setMessage("Push-Benachrichtigungen werden in diesem Browser oder auf diesem Gerät nicht unterstützt.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("blocked");
        setMessage("Push-Benachrichtigungen wurden im Browser blockiert.");
        return;
      }

      if (permission !== "granted") {
        setStatus("inactive");
        setMessage("Push-Benachrichtigungen wurden nicht aktiviert.");
        return;
      }

      const registration = await ensureServiceWorker();
      const existingSubscription = await registration.pushManager.getSubscription();
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const currentSubscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }));

      await saveSubscription(currentSubscription);
      setSubscription(currentSubscription);
      setStatus("supported");
      setMessage("Push-Benachrichtigungen wurden aktiviert.");
    } catch {
      setMessage(safeResponseMessage("Push-Benachrichtigungen konnten nicht aktiviert werden."));
      try {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        const currentSubscription = registration ? await registration.pushManager.getSubscription() : null;

        setSubscription(currentSubscription);
        setStatus(currentSubscription ? "supported" : Notification.permission === "denied" ? "blocked" : "inactive");
      } catch {
        setSubscription(null);
        setStatus("unsupported");
      }
    } finally {
      setIsBusy(false);
    }
  };

  const sendTestNotification = async () => {
    if (!subscription) {
      setMessage("Bitte aktivieren Sie Push-Benachrichtigungen zuerst auf diesem Gerät.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      const data = (await response.json().catch(() => null)) as { message?: unknown } | null;

      if (!response.ok) {
        throw new Error(
          typeof data?.message === "string" && data.message.trim().length > 0
            ? data.message
            : "Testbenachrichtigung konnte nicht gesendet werden.",
        );
      }

      setMessage("Testbenachrichtigung wurde gesendet.");
    } catch {
      setMessage("Testbenachrichtigung konnte nicht gesendet werden.");
    } finally {
      setIsBusy(false);
    }
  };

  const deactivateThisDevice = async () => {
    if (!subscription) {
      setMessage("Auf diesem Gerät ist aktuell keine Push-Benachrichtigung aktiv.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/push/subscription", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      const data = (await response.json().catch(() => null)) as { message?: unknown } | null;

      if (!response.ok) {
        throw new Error(
          typeof data?.message === "string" && data.message.trim().length > 0
            ? data.message
            : "Push-Benachrichtigungen konnten nicht deaktiviert werden.",
        );
      }

      await subscription.unsubscribe().catch(() => undefined);
      setSubscription(null);
      setStatus(Notification.permission === "denied" ? "blocked" : "inactive");
      setMessage("Push-Benachrichtigungen wurden auf diesem Gerät deaktiviert.");
    } catch {
      setMessage("Push-Benachrichtigungen konnten nicht deaktiviert werden.");
    } finally {
      setIsBusy(false);
    }
  };

  const statusLabel = STATUS_LABELS[status];

  return (
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, background: "#fff", display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Benachrichtigungen</h2>
      <p style={{ margin: 0, color: "#555" }}>
        Push-Benachrichtigungen informieren sofort über neue Leads. E-Mail bleibt als Fallback bestehen.
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        <strong>Status: {statusLabel}</strong>
        {status === "unsupported" ? (
          <span style={{ color: "#555" }}>
            Push ist in diesem Browser, auf diesem Gerät oder in der aktuellen Konfiguration nicht verfügbar.
          </span>
        ) : null}
        {status === "blocked" ? (
          <span style={{ color: "#555" }}>
            Der Browser blockiert Push-Benachrichtigungen. Bitte die Browser-Einstellungen prüfen.
          </span>
        ) : null}
        {status === "inactive" ? (
          <span style={{ color: "#555" }}>
            Push ist noch nicht aktiviert.
          </span>
        ) : null}
        {status === "supported" ? (
          <span style={{ color: "#555" }}>
            Push ist auf diesem Gerät aktiviert.
          </span>
        ) : null}
      </div>

      {message ? (
        <div style={{ padding: 12, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          {message}
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={() => {
            void activatePush();
          }}
          disabled={isBusy || status === "supported"}
        >
          Push-Benachrichtigungen aktivieren
        </button>

        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => {
            void sendTestNotification();
          }}
          disabled={isBusy || !subscription}
        >
          Testbenachrichtigung senden
        </button>

        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => {
            void deactivateThisDevice();
          }}
          disabled={isBusy || !subscription}
        >
          Auf diesem Gerät deaktivieren
        </button>
      </div>
    </section>
  );
}
