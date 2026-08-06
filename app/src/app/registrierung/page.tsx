import Link from "next/link";
import type { Metadata } from "next";

import LegalFooter from "@/shared/ui/LegalFooter";
import { getMarketCopy } from "@/shared/i18n/copy";
import { getRequestMarket } from "@/shared/i18n/request";

export const generateMetadata = async (): Promise<Metadata> => {
  const { config } = await getRequestMarket();
  const copy = getMarketCopy(config.code).shared.auth;

  return {
    title: `${copy.registrationTitle} | Varnito`,
    alternates: { canonical: `${config.siteUrl}/registrierung` },
    robots: { index: true, follow: true },
  };
};

export default async function RegistrationPage() {
  const { config, market } = await getRequestMarket();
  const copy = getMarketCopy(market).shared.auth;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px", display: "grid", gap: 24 }}>
      <section style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "#0f766e", fontWeight: 700 }}>{copy.registrationEyebrow}</p>
        <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.05 }}>{copy.registrationTitle}</h1>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          {copy.registrationLead}
        </p>
        <p style={{ margin: 0, fontWeight: 700, color: "#111827" }}>{copy.registrationPrice}</p>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.6 }}>{copy.registrationTaxNote}</p>
      </section>

      <section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href={`${config.siteUrl}/login`} style={{ display: "inline-flex", minHeight: 48, alignItems: "center", justifyContent: "center", padding: "0 18px", borderRadius: 999, background: "#0f766e", color: "#fff", fontWeight: 700 }}>
          {copy.registrationLoginCta}
        </Link>
        <Link href={config.siteUrl} style={{ display: "inline-flex", minHeight: 48, alignItems: "center", justifyContent: "center", padding: "0 18px", borderRadius: 999, border: "1px solid #d1d5db", background: "#fff", color: "#111827", fontWeight: 700 }}>
          {copy.registrationHomeCta}
        </Link>
      </section>

      <LegalFooter />
    </main>
  );
}
