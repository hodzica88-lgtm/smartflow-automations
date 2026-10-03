import { headers } from "next/headers";
import Link from "next/link";

import {
  appendGrowthSourceToHref,
  resolveGrowthSourceFromRequest,
} from "@/features/analytics/growth";
import DemoAssistants from "@/features/demo/DemoAssistants";
import DemoBanner from "@/features/demo/DemoBanner";
import { DemoProvider } from "@/features/demo/DemoProvider";
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

const exitLinkStyle = {
  ...linkStyle,
  color: "var(--gold)",
  background: "rgba(212, 175, 55, 0.08)",
  borderColor: "color-mix(in srgb, var(--gold) 60%, var(--border))",
} as const;

export default async function DemoLayout({
  children,
  searchParams,
}: {
  children: React.ReactNode;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market, config } = await getRequestMarket();
  const copy = getDemoCopy(market);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const headerStore = await headers();
  const referrer = headerStore.get("referer");
  const source = await resolveGrowthSourceFromRequest({ searchParams: resolvedSearchParams, referrer });
  const registerHref = appendGrowthSourceToHref("/registrierung", source);
  const siteUrl = config.siteUrl;
  const backToWebsiteLabel = market === "us" ? "← Back to website" : "← Zur Website";
  const exitDemoLabel = market === "us" ? "Exit demo" : "Demo verlassen";

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
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <Link href={siteUrl} style={exitLinkStyle} aria-label={backToWebsiteLabel}>
              {backToWebsiteLabel}
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <VarnitoLogo href="/demo/dashboard" subtitle="Demo" />
            <div style={navStyle}>
              <Link href="/demo/dashboard" style={linkStyle}>{copy.nav.dashboard}</Link>
              <Link href="/demo/leads" style={linkStyle}>{copy.nav.leads}</Link>
              <Link href="/demo/team" style={linkStyle}>{copy.nav.team}</Link>
              <Link href="/demo/billing" style={linkStyle}>{copy.nav.billing}</Link>
              <Link href="/demo/settings" style={linkStyle}>{copy.nav.settings}</Link>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <Link href={registerHref} style={linkStyle}>
              {copy.startFreeButton}
            </Link>
            <Link href={siteUrl} style={exitLinkStyle} aria-label={exitDemoLabel}>
              {exitDemoLabel}
            </Link>
          </div>
        </div>
      </header>

      {children}
      <DemoAssistants market={market} registerHref={registerHref} />
    </DemoProvider>
  );
}
