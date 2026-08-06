import Link from "next/link";

import { requireUserCompanyAccess } from "@/features/billing/service";
import { getCompanyUnreadNotificationCount } from "@/features/notifications/service";
import { DASHBOARD_COPY } from "@/shared/i18n/dashboard";
import { getRequestMarket } from "@/shared/i18n/request";
import VarnitoLogo from "@/shared/ui/VarnitoLogo";

import styles from "./dashboardLayout.module.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { market } = await getRequestMarket();
  const copy = DASHBOARD_COPY[market];
  const access = await requireUserCompanyAccess({
    allowMember: true,
    enforceBilling: false,
    nextPath: "/dashboard",
  });
  const unreadCount = await getCompanyUnreadNotificationCount(access.companyId);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.dock}>
          <div className={styles.left}>
            <VarnitoLogo href="/dashboard" subtitle={market === "us" ? "Workspace" : "Workspace"} />
            <div className={styles.nav}>
              <Link href="/dashboard" className={styles.link}>Dashboard</Link>
              <Link href="/dashboard/leads" className={styles.link}>Leads</Link>
              <Link href="/dashboard/settings" className={styles.link}>{copy.navSettings}</Link>
              <Link href="/dashboard/help" className={styles.link}>{copy.navHelp}</Link>
            </div>
          </div>

          <Link href="/dashboard/notifications" className={styles.notifyLink} aria-label={copy.navNotifications}>
            {copy.navBell}
            <span className={styles.count}>{unreadCount > 0 ? unreadCount : 0}</span>
          </Link>
        </div>
      </header>

      {children}
    </>
  );
}