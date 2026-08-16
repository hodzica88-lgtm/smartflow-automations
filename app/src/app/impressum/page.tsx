import type { Metadata } from "next";
import Link from "next/link";

import LegalFooter from "@/shared/ui/LegalFooter";
import { LEGAL_DOC_VERSION, LEGAL_ENTITY_NAME, LEGAL_CONTACT_EMAIL, LEGAL_REPRESENTATIVE, SITE_NAME, SITE_DOMAIN } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Impressum | Varnito",
  description: "Anbieterkennzeichnung und Kontakt für Varnito.",
  alternates: { canonical: `${SITE_DOMAIN}/impressum` },
  robots: { index: true, follow: true },
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ display: "grid", gap: 8 }}>
    <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
    <div style={{ color: "var(--muted)", lineHeight: 1.7 }}>{children}</div>
  </section>
);

export default function ImpressumPage() {
  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "40px 20px", display: "grid", gap: 24 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <Link href="/" style={{ display: "inline-flex", alignSelf: "start", border: "1px solid var(--border)", borderRadius: 999, padding: "8px 14px", color: "var(--text)", textDecoration: "none", fontWeight: 700 }}>
          Zur Startseite
        </Link>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>Rechtliches</p>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05 }}>Impressum</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
          Anbieterkennzeichnung und Kontaktangaben für das aktuelle Varnito-Angebot.
        </p>
      </header>

      <Section title="Anbieter">
        <p style={{ margin: 0 }}>{LEGAL_ENTITY_NAME}</p>
        <p style={{ margin: 0 }}>Vertreten durch: {LEGAL_REPRESENTATIVE}</p>
        <p style={{ margin: 0 }}>E-Mail: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a></p>
        <p style={{ margin: 0 }}>Website: {SITE_NAME} auf {SITE_DOMAIN}</p>
      </Section>

      <Section title="Ergänzende Angaben">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Kontaktaufnahme erfolgt zentral über die angegebene E-Mail-Adresse.</li>
          <li>Register- oder Steuerangaben werden ergänzt, soweit sie für das jeweilige Unternehmen gesetzlich erforderlich sind.</li>
        </ul>
      </Section>

      <Section title={`Prüfhinweis ${LEGAL_DOC_VERSION}`}>
        <p style={{ margin: 0 }}>
          Bei Änderungen des Unternehmensstatus oder der gesetzlichen Pflichtangaben ist das Impressum unverzüglich zu aktualisieren.
        </p>
      </Section>

      <LegalFooter />
    </main>
  );
}
