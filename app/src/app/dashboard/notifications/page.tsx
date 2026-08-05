import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUserCompanyAccess } from "@/features/billing/service";
import {
  listCompanyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/service";

const getString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

export async function markNotificationReadAction(formData: FormData) {
  "use server";

  const notificationId = getString(formData, "notification_id");
  if (!notificationId) {
    redirect("/dashboard/notifications");
  }

  const access = await requireUserCompanyAccess({
    allowMember: true,
    enforceBilling: false,
    nextPath: "/dashboard/notifications",
  });

  await markNotificationRead(access.companyId, notificationId);
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications");
}

export async function markAllNotificationsReadAction() {
  "use server";
  const access = await requireUserCompanyAccess({
    allowMember: true,
    enforceBilling: false,
    nextPath: "/dashboard/notifications",
  });

  await markAllNotificationsRead(access.companyId);
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications");
}

export default async function NotificationsPage() {
  const access = await requireUserCompanyAccess({
    allowMember: true,
    enforceBilling: false,
    nextPath: "/dashboard/notifications",
  });

  const items = await listCompanyNotifications(access.companyId, 100);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }}>
      <section>
        <p style={{ margin: 0, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Benachrichtigungen
        </p>
        <h1 style={{ margin: "6px 0" }}>Notification Center</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Neue Anfrage, Team-Ereignisse und Billing-Hinweise an einem Ort.
        </p>
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <form action={markAllNotificationsReadAction}>
          <button
            type="submit"
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: "10px 12px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Alle als gelesen markieren
          </button>
        </form>

        <Link
          href="/dashboard"
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 8,
            padding: "10px 12px",
            textDecoration: "none",
            color: "#111827",
            background: "#fff",
          }}
        >
          Zurück zum Dashboard
        </Link>
      </div>

      {items.length === 0 ? (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, background: "#fff" }}>
          Noch keine Benachrichtigungen vorhanden.
        </section>
      ) : (
        <section style={{ display: "grid", gap: 10 }}>
          {items.map((item) => (
            <article
              key={item.id}
              style={{
                border: `1px solid ${item.is_read ? "#e5e7eb" : "#bfdbfe"}`,
                borderRadius: 10,
                padding: 14,
                background: item.is_read ? "#fff" : "#eff6ff",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>{item.title}</strong>
                <span style={{ color: "#6b7280", fontSize: 13 }}>{formatDateTime(item.created_at)}</span>
              </div>
              <p style={{ margin: 0, color: "#374151" }}>{item.message}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#6b7280", fontSize: 12 }}>
                  {item.is_read ? "Gelesen" : "Ungelesen"}
                </span>
                {!item.is_read ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notification_id" value={item.id} />
                    <button
                      type="submit"
                      style={{
                        border: "1px solid #93c5fd",
                        borderRadius: 8,
                        padding: "8px 10px",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Als gelesen markieren
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}