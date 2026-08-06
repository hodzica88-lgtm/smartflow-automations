import Link from "next/link";

import DemoBanner from "@/features/demo/DemoBanner";
import DemoGuide from "@/features/demo/DemoGuide";
import { DemoProvider } from "@/features/demo/DemoProvider";
import DemoTour from "@/features/demo/DemoTour";
import { getDemoCopy } from "@/features/demo/copy";
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
  padding: "9px 13px",
  background: "rgba(255,255,255,0.03)",
  fontWeight: 600,
  fontSize: 14,
} as const;

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const { market, config } = await getRequestMarket();
  const copy = getDemoCopy(market);
  const registerHref = `${config.siteUrl}/registrierung`;

  return (
    <DemoProvider key={market} market={market}>
      <DemoBanner />
      <header
        style={{
          position: "sticky",
          top: 45,
          zIndex: 20,
          background: "rgba(11,11,13,0.9)",
          backdropFilter: "blur(10px)",
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
            <VarnitoLogo href="/demo/dashboard" subtitle="Demo" />
            <div style={navStyle}>
              <Link href="/demo/dashboard" style={linkStyle}>{copy.nav.dashboard}</Link>
              <Link href="/demo/leads" style={linkStyle}>{copy.nav.leads}</Link>
              <Link href="/demo/team" style={linkStyle}>{copy.nav.team}</Link>
              <Link href="/demo/billing" style={linkStyle}>{copy.nav.billing}</Link>
              <Link href="/demo/settings" style={linkStyle}>{copy.nav.settings}</Link>
            </div>
          </div>

          <Link href={registerHref} style={linkStyle}>
            {copy.startFreeButton}
          </Link>
        </div>
      </header>

      {children}
      <DemoTour market={market} registerHref={registerHref} />
      <DemoGuide />
    </DemoProvider>
  );
}
