import Link from "next/link";

import { DASHBOARD_COPY } from "@/shared/i18n/dashboard";
import VarnitoLogo from "@/shared/ui/VarnitoLogo";

import styles from "@/app/dashboard/dashboardLayout.module.css";

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12.5V5.5h7v7H4Zm9 0V4h7v8.5h-7ZM4 18.5v-5h7v5H4Zm9 0v-3h7v3h-7Z" fill="currentColor" />
  </svg>
);

const LeadsIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 5.5A2.5 2.5 0 0 1 9.5 3h5A2.5 2.5 0 0 1 17 5.5v1.8A2.5 2.5 0 0 1 14.5 9.8h-5A2.5 2.5 0 0 1 7 7.3V5.5Zm0 7.6A2.5 2.5 0 0 1 9.5 10.5h5a2.5 2.5 0 0 1 2.5 2.5v1.8A2.5 2.5 0 0 1 14.5 17h-5A2.5 2.5 0 0 1 7 14.5v-1.4Z" fill="currentColor" opacity="0.9" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.75a2.13 2.13 0 0 1 2.06 1.56l.16.71a6.44 6.44 0 0 1 1.76.9l.66-.35a2.12 2.12 0 0 1 2.74 1.05l.34 1.04a2.13 2.13 0 0 1-.87 2.71l-.66.35c.08.3.13.6.13.91s-.05.61-.13.91l.66.35a2.13 2.13 0 0 1 .87 2.71l-.34 1.04a2.12 2.12 0 0 1-2.74 1.05l-.66-.35a6.44 6.44 0 0 1-1.76.9l-.16.71A2.13 2.13 0 0 1 12 20.25a2.13 2.13 0 0 1-2.06-1.56l-.16-.71a6.44 6.44 0 0 1-1.76-.9l-.66.35a2.12 2.12 0 0 1-2.74-1.05l-.34-1.04a2.13 2.13 0 0 1 .87-2.71l.66-.35A6.24 6.24 0 0 1 5.9 12c0-.3.05-.61.13-.91l-.66-.35a2.13 2.13 0 0 1-.87-2.71l.34-1.04a2.12 2.12 0 0 1 2.74-1.05l.66.35a6.44 6.44 0 0 1 1.76-.9l.16-.71A2.13 2.13 0 0 1 12 3.75Zm0 4.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" fill="currentColor" />
  </svg>
);

const TeamIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8.75 10.25a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8Zm6.5 0a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8ZM5.5 17.5a4.2 4.2 0 0 1 4.2-4.2h.5a4.2 4.2 0 0 1 4.2 4.2v.8H5.5v-.8Zm9.25-1.7a3.65 3.65 0 0 1 3.75 3.5h-1.7a2.1 2.1 0 0 0-2.05-1.7h-.35v-.4a2.4 2.4 0 0 0-2.1-2.35c.42-.18.88-.28 1.35-.28Z" fill="currentColor" opacity="0.95" />
  </svg>
);

const HelpIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 5.16a2.63 2.63 0 0 0-1.83.75 2.27 2.27 0 0 0-.49 1.58h1.83c0-.5.2-.95.56-1.27.36-.32.85-.48 1.38-.42.42.05.79.2 1 .44.2.24.29.52.29.86 0 .35-.12.64-.37.89-.26.27-.58.49-.95.69-.36.2-.72.4-1.08.63-.37.24-.67.56-.9.97-.2.38-.31.8-.31 1.27v.36h1.87v-.24c0-.44.12-.8.36-1.07.25-.28.58-.5 1-.7.5-.25.96-.5 1.37-.85.4-.35.7-.8.9-1.34.2-.54.28-1.08.22-1.62-.12-1.06-.69-1.97-1.64-2.54A4.08 4.08 0 0 0 12 8.66Zm-.68 9.36h1.68v1.89H11.32v-1.89Z" fill="currentColor" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.5a5.5 5.5 0 0 1 5.5 5.5v2.17c0 1.83.74 3.59 2.08 4.86l.75.74h-16.66l.75-.74A6.82 6.82 0 0 0 6.5 11.17V9A5.5 5.5 0 0 1 12 3.5Zm0 17a2.75 2.75 0 0 1-2.63-1.88h5.26A2.75 2.75 0 0 1 12 20.5Z" fill="currentColor" />
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14.5 5.5 8 12l6.5 6.5-1.1 1.1L5.8 12l7.6-7.6 1.1 1.1Z" fill="currentColor" />
  </svg>
);

export type CustomerDashboardHeaderProps = {
  market: "de" | "us";
  unreadCount: number;
  previewMode?: boolean;
  backToOwner?: string;
  isOwner?: boolean;
};

export default function CustomerDashboardHeader({
  market,
  unreadCount,
  previewMode = false,
  backToOwner,
  isOwner = false,
}: CustomerDashboardHeaderProps) {
  const copy = DASHBOARD_COPY[market];
  const leadsLabel = market === "us" ? "Leads" : "Anfragen";
  const teamLabel = market === "us" ? "Team" : "Team";
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { href: "/dashboard/leads", label: leadsLabel, icon: <LeadsIcon /> },
    ...(isOwner ? [{ href: "/dashboard/team", label: teamLabel, icon: <TeamIcon /> }] : []),
    { href: "/dashboard/settings", label: copy.navSettings, icon: <SettingsIcon /> },
    { href: "/dashboard/help", label: copy.navHelp, icon: <HelpIcon /> },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarInner}>
        <VarnitoLogo href="/dashboard" subtitle={market === "us" ? "Workspace" : "Workspace"} />

        <nav className={styles.nav} aria-label="Dashboard navigation">
          {navItems.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${href === "/dashboard" ? styles.active : ""}`}
            >
              <span className={styles.navLabel}>
                <span className={styles.navIcon}>{icon}</span>
                <span>{label}</span>
              </span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {previewMode && backToOwner ? (
            <Link href={backToOwner} className={styles.backLink}>
              <span className={styles.navIcon}><BackIcon /></span>
              <span>{market === "us" ? "Back to Owner Dashboard" : "Zurück zum Owner-Dashboard"}</span>
            </Link>
          ) : null}

          <Link href="/dashboard/notifications" className={styles.notifyLink} aria-label={copy.navNotifications}>
            <span className={styles.navLabel}>
              <span className={styles.navIcon}><BellIcon /></span>
              <span>{copy.navBell}</span>
            </span>
            <span className={styles.count}>{unreadCount > 0 ? unreadCount : 0}</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
