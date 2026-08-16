import type { Metadata } from "next";
import Link from "next/link";

import LegalFooter from "@/shared/ui/LegalFooter";
import { SITE_DOMAIN } from "@/shared/config/site";
import { getRequestMarket } from "@/shared/i18n/request";

export const metadata: Metadata = {
  title: "Datenschutz | Varnito",
  description: "Datenschutzhinweise zu den in Varnito eingesetzten Diensten und Verarbeitungen.",
  alternates: { canonical: `${SITE_DOMAIN}/datenschutz` },
  robots: { index: true, follow: true },
};

const listStyle = { margin: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--muted)" } as const;

export default async function DatenschutzPage() {
  const { market } = await getRequestMarket();

  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "40px 20px", display: "grid", gap: 24 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <Link href="/" style={{ display: "inline-flex", alignSelf: "start", border: "1px solid var(--border)", borderRadius: 999, padding: "8px 14px", color: "var(--text)", textDecoration: "none", fontWeight: 700 }}>
          {market === "us" ? "Back to home" : "Zur Startseite"}
        </Link>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>Rechtliches</p>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05 }}>Datenschutzerklärung</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
          Diese Seite beschreibt die aktuell in Varnito eingesetzten technischen Verarbeitungen und die dabei verwendeten Systeme.
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
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
          Im aktuellen Code sind keine Marketing- oder Analyse-Tools, keine Drittanbieter-Tracker und kein Einwilligungs-Banner für nicht notwendige Cookies erkennbar. Es werden nur technisch erforderliche Session- und Authentifizierungsmechanismen verwendet.
        </p>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Betroffenenrechte</h2>
        <ul style={listStyle}>
          <li>Auskunft über gespeicherte personenbezogene Daten</li>
          <li>Berichtigung unrichtiger Daten</li>
          <li>Löschung oder Einschränkung der Verarbeitung im Rahmen der gesetzlichen Vorgaben</li>
          <li>Widerspruch gegen Verarbeitungen, soweit hierfür ein gesetzliches Recht besteht</li>
        </ul>
      </section>

      <LegalFooter />
    </main>
  );
}
