import Link from "next/link";

import { requireUserCompanyAccess } from "@/features/billing/service";
import { getCompanyUnreadNotificationCount } from "@/features/notifications/service";

const navStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
} as const;

const linkStyle = {
  color: "#1f2937",
  textDecoration: "none",
  border: "1px solid #d1d5db",
  borderRadius: 999,
  padding: "8px 12px",
  background: "#fff",
  fontWeight: 600,
  fontSize: 14,
} as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          background: "#f8fafc",
          borderBottom: "1px solid #e5e7eb",
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
          <div style={navStyle}>
            <Link href="/dashboard" style={linkStyle}>Dashboard</Link>
            <Link href="/dashboard/leads" style={linkStyle}>Leads</Link>
            <Link href="/dashboard/settings" style={linkStyle}>Einstellungen</Link>
            <Link href="/dashboard/help" style={linkStyle}>Hilfe</Link>
          </div>

          <Link href="/dashboard/notifications" style={linkStyle} aria-label="Benachrichtigungen">
            Glocke {unreadCount > 0 ? `(${unreadCount})` : "(0)"}
          </Link>
        </div>
      </header>

      {children}
    </>
  );
}