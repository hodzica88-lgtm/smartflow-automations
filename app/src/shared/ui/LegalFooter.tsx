import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";
import Link from "next/link";
import VarnitoLogo from "@/shared/ui/VarnitoLogo";

export default async function LegalFooter() {
  const { market, config } = await getRequestMarket();
  const copy = getMarketCopy(market);
  const legalLinks = [
    { href: `${config.siteUrl}/impressum`, label: copy.shared.legalLinks.imprint },
    { href: `${config.siteUrl}/datenschutz`, label: copy.shared.legalLinks.privacy },
    { href: `${config.siteUrl}/agb`, label: copy.shared.legalLinks.terms },
    { href: `${config.siteUrl}/widerruf`, label: copy.shared.legalLinks.withdrawal },
    { href: `${config.siteUrl}/kontakt`, label: copy.shared.legalLinks.contact },
  ] as const;

  return (
    <footer style={{ width: "min(100%, 78rem)", margin: "0 auto", padding: "2.5rem 1.25rem 2rem", color: "var(--muted)" }}>
      <div style={{ display: "grid", gap: 16, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
          <VarnitoLogo subtitle={market === "us" ? "Lead Operating System" : "Lead-Betriebssystem"} />
          <a href={`mailto:${config.legalContactEmail}`} style={{ color: "var(--gold)", fontWeight: 700 }}>
            {config.legalContactEmail}
          </a>
        </div>
        <nav aria-label={copy.shared.legalNavLabel} style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {legalLinks.map((entry) => (
            <Link key={entry.href} href={entry.href} style={{ color: "var(--text)", fontWeight: 600, border: "1px solid var(--border)", borderRadius: 999, padding: "8px 12px", background: "rgba(255,255,255,0.02)" }}>
              {entry.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
