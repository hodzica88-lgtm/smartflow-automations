import type { Metadata } from "next";

import LegalFooter from "@/shared/ui/LegalFooter";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";

export const generateMetadata = async (): Promise<Metadata> => {
  const { config, market } = await getRequestMarket();
  const copy = getMarketCopy(market).shared.contact;
  return {
    title: `${copy.title} | Varnito`,
    alternates: { canonical: `${config.siteUrl}/kontakt` },
    robots: { index: true, follow: true },
  };
};

export default async function KontaktPage() {
  const { config, market } = await getRequestMarket();
  const copy = getMarketCopy(market).shared.contact;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px", display: "grid", gap: 24 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "#0f766e", fontWeight: 700 }}>{copy.eyebrow}</p>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05 }}>{copy.title}</h1>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          {copy.lead}
        </p>
      </header>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{copy.emailLabel}</h2>
        <a href={`mailto:${config.legalContactEmail}`} style={{ color: "#0f766e", fontWeight: 700 }}>
          {config.legalContactEmail}
        </a>
      </section>

      <LegalFooter />
    </main>
  );
}