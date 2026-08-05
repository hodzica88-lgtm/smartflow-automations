import type { Metadata } from "next";

import LegalFooter from "@/shared/ui/LegalFooter";
import { LEGAL_DOC_VERSION, LEGAL_ENTITY_NAME, LEGAL_CONTACT_EMAIL, SITE_NAME, SITE_DOMAIN } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Impressum | Varnito",
  alternates: { canonical: `${SITE_DOMAIN}/impressum` },
  robots: { index: true, follow: true },
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ display: "grid", gap: 8 }}>
    <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
    <div style={{ color: "#4b5563", lineHeight: 1.7 }}>{children}</div>
  </section>
);

export default function ImpressumPage() {
  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "40px 20px", display: "grid", gap: 24 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "#0f766e", fontWeight: 700 }}>Rechtliches</p>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05 }}>Impressum</h1>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          Dieses Impressum ist technisch eingebunden, muss aber vor dem Livegang durch eine rechtliche Fachstelle geprüft und mit den echten Unternehmensdaten vervollständigt werden.
        </p>
      </header>

      <Section title="Anbieter">
        <p style={{ margin: 0 }}>{LEGAL_ENTITY_NAME}</p>
        <p style={{ margin: 0 }}>Vertreten durch: Almir Hodzic</p>
        <p style={{ margin: 0 }}>E-Mail: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a></p>
        <p style={{ margin: 0 }}>Website: {SITE_NAME} auf {SITE_DOMAIN}</p>
      </Section>

      <Section title="Pflichtangaben vor Livegang">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>vollständige Postanschrift</li>
          <li>Telefonnummer oder ein gleichwertiger Kontaktkanal, falls erforderlich</li>
          <li>Handelsregister, Registergericht und Registernummer, falls vorhanden</li>
          <li>Umsatzsteuer-ID, falls vorhanden</li>
        </ul>
      </Section>

      <Section title={`Prüfhinweis ${LEGAL_DOC_VERSION}`}>
        <p style={{ margin: 0 }}>
          Vor dem Verkauf an Endkunden oder der Veröffentlichung in der Produktion müssen die Rechtstexte durch einen spezialisierten Rechtstext-Anbieter oder eine Rechtsberatung geprüft und auf den tatsächlichen Unternehmensstatus angepasst werden.
        </p>
      </Section>

      <LegalFooter />
    </main>
  );
}
