import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import dashboardStyles from "@/app/operator/owner/owner.module.css";
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
    <main className={dashboardStyles.shell}>
      <header className={`${dashboardStyles.header} ${dashboardStyles.notificationHeader}`}>
        <div className={dashboardStyles.topRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Link href="/operator/owner" className={dashboardStyles.linkButton}>
              Varnito
            </Link>
            <nav className={dashboardStyles.actions} aria-label="Owner navigation">
              <Link className={dashboardStyles.linkButton} href="/operator/owner">
                Dashboard
              </Link>
              <Link className={dashboardStyles.linkButton} href="/operator/notifications">
                {copy.sectionLabel}
              </Link>
            </nav>
          </div>

          <form action={logoutAction}>
            <button type="submit" className="premium-button">
              {market === "us" ? "Log out" : "Abmelden"}
            </button>
          </form>
        </div>
      </header>

      <section className={dashboardStyles.notificationIntro}>
        <p className={dashboardStyles.eyebrow}>{copy.sectionLabel}</p>
        <h1 className={dashboardStyles.notificationTitle}>{copy.heading}</h1>
        <p className={dashboardStyles.notificationSubheading}>{copy.subheading}</p>
      </section>

      <div className={dashboardStyles.notificationToolbar}>
        <form action={markOwnerAllNotificationsReadAction}>
          <button type="submit" className={`${dashboardStyles.linkButton} ${dashboardStyles.notificationActionButton}`}>
            {copy.markAllRead}
          </button>
        </form>

        <Link href="/operator/owner" className={`${dashboardStyles.linkButton} ${dashboardStyles.notificationActionButton}`}>
          {copy.backToDashboard}
        </Link>
      </div>

      {items.length === 0 ? (
        <section className={dashboardStyles.notificationEmptyState}>
          {copy.empty}
        </section>
      ) : (
        <section className={dashboardStyles.notificationList}>
          {items.map((item) => (
            <article
              key={item.id}
              className={`${dashboardStyles.notificationCard} ${item.is_read ? "" : dashboardStyles.notificationCardUnread}`}
            >
              <div className={dashboardStyles.notificationHeaderRow}>
                <strong className={dashboardStyles.notificationTitleText}>{item.title}</strong>
                <span className={dashboardStyles.notificationTimestamp}>{formatDateTimeByLocale(item.created_at, config.locale)}</span>
              </div>
              <p className={dashboardStyles.notificationBodyText}>{item.message}</p>
              <div className={dashboardStyles.notificationFooterRow}>
                <span className={`${dashboardStyles.notificationStatus} ${item.is_read ? dashboardStyles.notificationStatusRead : dashboardStyles.notificationStatusUnread}`}>
                  {item.is_read ? copy.read : copy.unread}
                </span>
                {!item.is_read ? (
                  <form action={markOwnerNotificationReadAction}>
                    <input type="hidden" name="notification_id" value={item.id} />
                    <input type="hidden" name="company_id" value={item.company_id} />
                    <button type="submit" className={dashboardStyles.notificationPrimaryButton}>
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
