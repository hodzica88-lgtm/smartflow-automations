import type { Metadata } from "next";

import LegalFooter from "@/shared/ui/LegalFooter";
import { LEGAL_DOC_VERSION } from "@/shared/config/site";
import { getRequestMarket } from "@/shared/i18n/request";

export const generateMetadata = async (): Promise<Metadata> => {
  const { config } = await getRequestMarket();

  return {
    title: "AGB | Varnito",
    alternates: { canonical: `${config.siteUrl}/agb` },
    robots: { index: true, follow: true },
  };
};

export default async function AgbPage() {
  const { market } = await getRequestMarket();

  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "40px 20px", display: "grid", gap: 24 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "#0f766e", fontWeight: 700 }}>Rechtliches</p>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05 }}>Allgemeine Geschäftsbedingungen</h1>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          Diese AGB-Seite ist als technische Grundlage vorbereitet und muss vor dem Livegang durch einen spezialisierten Rechtstext-Anbieter geprüft und finalisiert werden.
        </p>
      </header>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Geltungsbereich</h2>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          Varnito richtet sich an Unternehmen. Die AGB müssen vor Veröffentlichung auf die tatsächliche Vertragsstruktur, Leistungsbeschreibung, Laufzeiten, Kündigung und Haftungsregeln angepasst werden.
        </p>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Preis- und Steuerhinweise</h2>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          Deutschland: Alle Preise verstehen sich zzgl. der jeweils geltenden gesetzlichen Umsatzsteuer.
        </p>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          USA: Applicable taxes are calculated during checkout where required.
        </p>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Wichtige Platzhalter</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: "#4b5563" }}>
          <li>Leistungsumfang und Verfügbarkeit</li>
          <li>Preislogik, Steuerhinweis und Abrechnungszeitpunkt</li>
          <li>Kündigungsfristen und Vertragsende</li>
          <li>Haftung, Gewährleistung und Supportprozesse</li>
        </ul>
      </section>

      {market === "us" ? (
        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>US Tax Notice</h2>
          <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
            Applicable taxes are calculated during checkout where required.
          </p>
        </section>
      ) : null}

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Prüfhinweis {LEGAL_DOC_VERSION}</h2>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          Vor dem Verkauf müssen die AGB und die zugehörigen Rechtstexte juristisch geprüft werden.
        </p>
      </section>

      <LegalFooter />
    </main>
  );
}
