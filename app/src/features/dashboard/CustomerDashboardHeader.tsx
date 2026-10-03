import Link from "next/link";

import { DASHBOARD_COPY } from "@/shared/i18n/dashboard";
import VarnitoLogo from "@/shared/ui/VarnitoLogo";

import styles from "@/app/dashboard/dashboardLayout.module.css";

export type CustomerDashboardHeaderProps = {
  market: "de" | "us";
  unreadCount: number;
  previewMode?: boolean;
  backToOwner?: string;
};

export default function CustomerDashboardHeader({
  market,
  unreadCount,
  previewMode = false,
  backToOwner,
}: CustomerDashboardHeaderProps) {
  const copy = DASHBOARD_COPY[market];

  return (
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

        <div className={styles.nav}>
          {previewMode && backToOwner ? (
            <Link href={backToOwner} className={styles.link}>
              {market === "us" ? "Back to Owner Dashboard" : "Zurück zum Owner-Dashboard"}
            </Link>
          ) : null}

          <Link href="/dashboard/notifications" className={styles.notifyLink} aria-label={copy.navNotifications}>
            {copy.navBell}
            <span className={styles.count}>{unreadCount > 0 ? unreadCount : 0}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
