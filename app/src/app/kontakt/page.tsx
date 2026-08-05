import type { Metadata } from "next";

import LegalFooter from "@/shared/ui/LegalFooter";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY_NAME, SITE_DOMAIN } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Kontakt | Varnito",
  alternates: { canonical: `${SITE_DOMAIN}/kontakt` },
  robots: { index: true, follow: true },
};

export default function KontaktPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px", display: "grid", gap: 24 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "#0f766e", fontWeight: 700 }}>Kontakt</p>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05 }}>Kontakt aufnehmen</h1>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          Für Rückfragen zu {LEGAL_ENTITY_NAME} nutzen Sie bitte die zentrale Kontakt-E-Mail. Die finale Kontaktangabe muss vor dem Livegang geprüft und vervollständigt werden.
        </p>
      </header>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>E-Mail</h2>
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} style={{ color: "#0f766e", fontWeight: 700 }}>
          {LEGAL_CONTACT_EMAIL}
        </a>
      </section>

      <LegalFooter />
    </main>
  );
}