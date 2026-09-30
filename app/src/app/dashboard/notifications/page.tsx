import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUserCompanyAccess } from "@/features/billing/service";
import {
  listCompanyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/service";
import { NOTIFICATION_CENTER_COPY } from "@/shared/i18n/dashboard";
import { getRequestMarket } from "@/shared/i18n/request";

const getString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const formatDateTimeByLocale = (value: string, locale: "de-DE" | "en-US") => {
  try {
    return new Date(value).toLocaleString(locale, {
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
  const { market, config } = await getRequestMarket();
  const copy = NOTIFICATION_CENTER_COPY[market];
  const access = await requireUserCompanyAccess({
    allowMember: true,
    enforceBilling: false,
    nextPath: "/dashboard/notifications",
  });

  const items = await listCompanyNotifications(access.companyId, 100);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }}>
      <section>
        <p style={{ margin: 0, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569" }}>
          {copy.sectionLabel}
        </p>
        <h1 style={{ margin: "6px 0", color: "#0f172a" }}>{copy.heading}</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          {copy.subheading}
        </p>
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <form action={markAllNotificationsReadAction}>
          <button
            type="submit"
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "10px 12px",
              background: "#1f2937",
              color: "#f8fafc",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
            }}
          >
            {copy.markAllRead}
          </button>
        </form>

        <Link
          href="/dashboard"
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "10px 12px",
            textDecoration: "none",
            color: "#0f172a",
            background: "#f8fafc",
            fontWeight: 700,
          }}
        >
          {copy.backToDashboard}
        </Link>
      </div>

      {items.length === 0 ? (
        <section style={{ border: "1px solid #dbe4ee", borderRadius: 10, padding: 20, background: "#f8fafc", color: "#0f172a" }}>
          {copy.empty}
        </section>
      ) : (
        <section style={{ display: "grid", gap: 10 }}>
          {items.map((item) => (
            <article
              key={item.id}
              style={{
                border: `1px solid ${item.is_read ? "#dbe4ee" : "#fbbf24"}`,
                borderRadius: 10,
                padding: 14,
                background: item.is_read ? "#f8fafc" : "#fff7ed",
                display: "grid",
                gap: 8,
                boxShadow: item.is_read ? "none" : "0 0 0 1px rgba(251, 191, 36, 0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                <strong style={{ color: "#0f172a" }}>{item.title}</strong>
                <span style={{ color: "#64748b", fontSize: 13 }}>{formatDateTimeByLocale(item.created_at, config.locale)}</span>
              </div>
              <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>{item.message}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ color: item.is_read ? "#475569" : "#7c2d12", fontSize: 12, fontWeight: 700 }}>
                  {item.is_read ? copy.read : copy.unread}
                </span>
                {!item.is_read ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notification_id" value={item.id} />
                    <button
                      type="submit"
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        padding: "8px 10px",
                        background: "#0f172a",
                        color: "#f8fafc",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      {copy.markRead}
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