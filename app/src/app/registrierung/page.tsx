import Link from "next/link";
import type { Metadata } from "next";

import LegalFooter from "@/shared/ui/LegalFooter";
import { SITE_DOMAIN } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Registrierung | Varnito",
  alternates: { canonical: `${SITE_DOMAIN}/registrierung` },
  robots: { index: true, follow: true },
};

export default function RegistrationPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px", display: "grid", gap: 24 }}>
      <section style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "#0f766e", fontWeight: 700 }}>Varnito</p>
        <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.05 }}>Registrierung starten</h1>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          Für den Testzugang melden Sie sich an und legen im Anschluss Ihre Firma an. Danach kann die 30-Tage-Testphase gestartet werden.
        </p>
      </section>

      <section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/login" style={{ display: "inline-flex", minHeight: 48, alignItems: "center", justifyContent: "center", padding: "0 18px", borderRadius: 999, background: "#0f766e", color: "#fff", fontWeight: 700 }}>
          Zum Login
        </Link>
        <Link href="/" style={{ display: "inline-flex", minHeight: 48, alignItems: "center", justifyContent: "center", padding: "0 18px", borderRadius: 999, border: "1px solid #d1d5db", background: "#fff", color: "#111827", fontWeight: 700 }}>
          Zur Startseite
        </Link>
      </section>

      <LegalFooter />
    </main>
  );
}
