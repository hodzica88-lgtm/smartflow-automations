import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";
import Link from "next/link";

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
    <footer style={{ width: "min(100%, 72rem)", margin: "0 auto", padding: "1.5rem 1rem 2rem", color: "#667085" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
        <nav aria-label={copy.shared.legalNavLabel} style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {legalLinks.map((entry) => (
            <Link key={entry.href} href={entry.href} style={{ color: "#0f766e", fontWeight: 700 }}>
              {entry.label}
            </Link>
          ))}
        </nav>
        <a href={`mailto:${config.legalContactEmail}`} style={{ color: "#0f766e", fontWeight: 700 }}>
          {config.legalContactEmail}
        </a>
      </div>
    </footer>
  );
}
