import Link from "next/link";

import { requireUserCompanyAccess } from "@/features/billing/service";
import { getCompanyUnreadNotificationCount } from "@/features/notifications/service";
import { DASHBOARD_COPY } from "@/shared/i18n/dashboard";
import { getRequestMarket } from "@/shared/i18n/request";
import VarnitoLogo from "@/shared/ui/VarnitoLogo";

const navStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
} as const;

const linkStyle = {
  color: "var(--text)",
  textDecoration: "none",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "10px 14px",
  background: "rgba(255,255,255,0.02)",
  fontWeight: 600,
  fontSize: 14,
} as const;

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
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(11,11,13,0.88)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <VarnitoLogo href="/dashboard" subtitle={market === "us" ? "Workspace" : "Workspace"} />
            <div style={navStyle}>
              <Link href="/dashboard" style={linkStyle}>Dashboard</Link>
              <Link href="/dashboard/leads" style={linkStyle}>Leads</Link>
              <Link href="/dashboard/settings" style={linkStyle}>{copy.navSettings}</Link>
              <Link href="/dashboard/help" style={linkStyle}>{copy.navHelp}</Link>
            </div>
          </div>

          <Link href="/dashboard/notifications" style={linkStyle} aria-label={copy.navNotifications}>
            {copy.navBell} {unreadCount > 0 ? `(${unreadCount})` : "(0)"}
          </Link>
        </div>
      </header>

      {children}
    </>
  );
}