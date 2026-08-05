import type { Metadata } from "next";

import LegalFooter from "@/shared/ui/LegalFooter";
import { SITE_DOMAIN } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Datenschutz | Varnito",
  alternates: { canonical: `${SITE_DOMAIN}/datenschutz` },
  robots: { index: true, follow: true },
};

const listStyle = { margin: 0, paddingLeft: 18, lineHeight: 1.7, color: "#4b5563" } as const;

export default function DatenschutzPage() {
  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "40px 20px", display: "grid", gap: 24 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "#0f766e", fontWeight: 700 }}>Rechtliches</p>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05 }}>Datenschutzerklärung</h1>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          Diese Seite beschreibt die im Code tatsächlich erkennbaren Verarbeitungen. Sie ersetzt keine juristische Prüfung und muss vor dem Livegang finalisiert werden.
        </p>
      </header>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Eingesetzte Dienste</h2>
        <ul style={listStyle}>
          <li>Supabase für Authentifizierung, Datenbank und serverseitige Datenverarbeitung</li>
          <li>Stripe für Billing, Checkout und Abonnementverwaltung</li>
          <li>Brevo für transaktionale E-Mails</li>
          <li>Serverhosting der Next.js-Anwendung, Plattform noch manuell zu verifizieren</li>
        </ul>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Cookie- und Tracking-Status</h2>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          Im aktuellen Code sind keine Marketing- oder Analyse-Tools, keine Drittanbieter-Tracker und kein Einwilligungs-Banner für nicht notwendige Cookies erkennbar. Es werden nur technisch erforderliche Session- und Authentifizierungsmechanismen verwendet.
        </p>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Offene Punkte vor Livegang</h2>
        <ul style={listStyle}>
          <li>tatsächliche Kontaktadresse, Telefonnummer und Registerdaten ergänzen</li>
          <li>finale Hosting-Plattform im Text benennen</li>
          <li>rechtliche Prüfung der Datenverarbeitung, Auftragsverarbeitung und Löschfristen</li>
          <li>ggf. ergänzende AV-Verträge und interne Prozesse dokumentieren</li>
        </ul>
      </section>

      <LegalFooter />
    </main>
  );
}
