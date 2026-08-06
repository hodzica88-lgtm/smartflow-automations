import Link from "next/link";

import DemoBanner from "@/features/demo/DemoBanner";
import { DemoProvider } from "@/features/demo/DemoProvider";
import DemoTour from "@/features/demo/DemoTour";
import { getRequestMarket } from "@/shared/i18n/request";

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

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const { market } = await getRequestMarket();

  return (
    <DemoProvider market={market}>
      <DemoBanner />
      <header
        style={{
          position: "sticky",
          top: 45,
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
            <Link href="/demo/dashboard" style={linkStyle}>Dashboard</Link>
            <Link href="/demo/leads" style={linkStyle}>Leads</Link>
            <Link href="/demo/team" style={linkStyle}>Team</Link>
            <Link href="/demo/billing" style={linkStyle}>Billing</Link>
            <Link href="/demo/settings" style={linkStyle}>Einstellungen</Link>
          </div>

          <Link href="/registrierung" style={linkStyle}>
            Jetzt kostenlos starten
          </Link>
        </div>
      </header>

      {children}
      <DemoTour market={market} />
    </DemoProvider>
  );
}
