import type { Metadata } from "next";
import Link from "next/link";

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
        <Link href="/" style={{ display: "inline-flex", alignSelf: "start", border: "1px solid var(--border)", borderRadius: 999, padding: "8px 14px", color: "var(--text)", textDecoration: "none", fontWeight: 700 }}>
          {market === "us" ? "Back to home" : "Zur Startseite"}
        </Link>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>Rechtliches</p>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05 }}>Allgemeine Geschäftsbedingungen</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
          Diese AGB beschreiben das aktuelle B2B-Angebot von Varnito auf Basis der technisch umgesetzten Produkt- und Billing-Flows.
        </p>
      </header>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Geltungsbereich</h2>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
          Varnito richtet sich ausschließlich an Unternehmer im Sinne von § 14 BGB sowie an vergleichbare gewerbliche Nutzer in anderen Rechtsordnungen. Verbraucherangebote sind nicht Bestandteil des aktuellen Produkts.
        </p>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Preis- und Steuerhinweise</h2>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
          Deutschland: Alle Preise verstehen sich zzgl. der jeweils geltenden gesetzlichen Umsatzsteuer.
        </p>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
          USA: Applicable taxes are calculated during checkout where required.
        </p>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Leistung und Laufzeit</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--muted)" }}>
          <li>Varnito wird als cloudbasierte Software zur Lead-Erfassung und Team-Bearbeitung bereitgestellt.</li>
          <li>Neue Firmen starten mit einer Testphase entsprechend der jeweils ausgewiesenen Angebotsseite.</li>
          <li>Nach Ablauf der Testphase läuft das gewählte Abonnement monatlich weiter, bis es fristgerecht beendet wird.</li>
          <li>Kündigungen wirken zum Ende der laufenden Abrechnungsperiode; bereits bezahlte Zeiträume werden nicht anteilig erstattet, sofern keine zwingenden gesetzlichen Gründe entgegenstehen.</li>
        </ul>
      </section>

      {market === "us" ? (
        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>US Tax Notice</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            Applicable taxes are calculated during checkout where required.
          </p>
        </section>
      ) : null}

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Prüfhinweis {LEGAL_DOC_VERSION}</h2>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
          Änderungen an Produktumfang, Abrechnung oder Zielgruppe müssen in diesen AGB sowie den übrigen Rechtstexten nachgeführt werden.
        </p>
      </section>

      <LegalFooter />
    </main>
  );
}
