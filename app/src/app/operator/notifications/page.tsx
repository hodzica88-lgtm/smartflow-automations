import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/features/auth/actions";
import {
  listOwnerBusinessNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/service";
import { requireOperatorUser } from "@/features/operator/access";
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

export async function markOwnerNotificationReadAction(formData: FormData) {
  "use server";

  const notificationId = getString(formData, "notification_id");
  const companyId = getString(formData, "company_id");

  if (!notificationId || !companyId) {
    redirect("/operator/notifications");
  }

  await requireOperatorUser({ nextPath: "/operator/notifications" });

  await markNotificationRead(companyId, notificationId);
  revalidatePath("/operator/notifications");
  redirect("/operator/notifications");
}

export async function markOwnerAllNotificationsReadAction() {
  "use server";

  await requireOperatorUser({ nextPath: "/operator/notifications" });

  const items = await listOwnerBusinessNotifications(200);
  const companyIds = Array.from(new Set(items.map((item) => item.company_id).filter(Boolean)));

  for (const companyId of companyIds) {
    await markAllNotificationsRead(companyId);
  }

  revalidatePath("/operator/notifications");
  redirect("/operator/notifications");
}

export default async function OwnerNotificationsPage() {
  const { market, config } = await getRequestMarket();
  const copy = NOTIFICATION_CENTER_COPY[market];
  await requireOperatorUser({ nextPath: "/operator/notifications" });
  const items = await listOwnerBusinessNotifications(100);

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "16px 18px",
          border: "1px solid var(--border)",
          borderRadius: 18,
          background: "linear-gradient(155deg, rgba(255,255,255,0.03), rgba(255,255,255,0.012))",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/operator/owner" style={{ color: "var(--text)", textDecoration: "none", fontWeight: 900 }}>
            Varnito
          </Link>
          <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }} aria-label="Owner navigation">
            <Link href="/operator/owner" style={{ color: "var(--text)", textDecoration: "none", border: "1px solid var(--border)", borderRadius: 999, padding: "0.55rem 0.9rem", background: "rgba(255,255,255,0.02)" }}>
              Dashboard
            </Link>
            <Link href="/operator/notifications" style={{ color: "var(--text)", textDecoration: "none", border: "1px solid var(--border)", borderRadius: 999, padding: "0.55rem 0.9rem", background: "rgba(255,255,255,0.02)" }}>
              {copy.sectionLabel}
            </Link>
          </nav>
        </div>

        <form action={logoutAction}>
          <button type="submit" className="premium-button">
            {market === "us" ? "Log out" : "Abmelden"}
          </button>
        </form>
      </header>

      <section>
        <p style={{ margin: 0, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569" }}>
          {copy.sectionLabel}
        </p>
        <h1 style={{ margin: "6px 0", color: "#0f172a" }}>{copy.heading}</h1>
        <p style={{ margin: 0, color: "#475569" }}>{copy.subheading}</p>
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <form action={markOwnerAllNotificationsReadAction}>
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
            }}
          >
            {copy.markAllRead}
          </button>
        </form>

        <Link
          href="/operator/owner"
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
        <section style={{ border: "1px solid #dbe4ee", borderRadius: 12, padding: 20, background: "#f8fafc", color: "#0f172a" }}>
          {copy.empty}
        </section>
      ) : (
        <section style={{ display: "grid", gap: 12 }}>
          {items.map((item) => (
            <article
              key={item.id}
              style={{
                border: `1px solid ${item.is_read ? "#dbe4ee" : "#fbbf24"}`,
                borderRadius: 12,
                padding: 14,
                background: item.is_read ? "#f8fafc" : "#fff7ed",
                boxShadow: item.is_read ? "none" : "0 0 0 1px rgba(251,191,36,0.2)",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <strong style={{ color: "#0f172a" }}>{item.title}</strong>
                <span style={{ color: "#64748b", fontSize: 13 }}>{formatDateTimeByLocale(item.created_at, config.locale)}</span>
              </div>
              <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>{item.message}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: item.is_read ? "#475569" : "#7c2d12", fontWeight: 700, fontSize: 12 }}>
                  {item.is_read ? copy.read : copy.unread}
                </span>
                {!item.is_read ? (
                  <form action={markOwnerNotificationReadAction}>
                    <input type="hidden" name="notification_id" value={item.id} />
                    <input type="hidden" name="company_id" value={item.company_id} />
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
