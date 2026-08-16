import type { Metadata } from "next";
import Link from "next/link";

import LegalFooter from "@/shared/ui/LegalFooter";
import { SITE_DOMAIN } from "@/shared/config/site";
import { getRequestMarket } from "@/shared/i18n/request";

export const metadata: Metadata = {
  title: "Widerruf | Varnito",
  description: "Hinweis zum Widerrufsrecht für das aktuelle B2B-Angebot von Varnito.",
  alternates: { canonical: `${SITE_DOMAIN}/widerruf` },
  robots: { index: true, follow: true },
};

export default async function WiderrufPage() {
  const { market } = await getRequestMarket();

  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "40px 20px", display: "grid", gap: 24 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <Link href="/" style={{ display: "inline-flex", alignSelf: "start", border: "1px solid var(--border)", borderRadius: 999, padding: "8px 14px", color: "var(--text)", textDecoration: "none", fontWeight: 700 }}>
          {market === "us" ? "Back to home" : "Zur Startseite"}
        </Link>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>Rechtliches</p>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05 }}>Widerruf</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
          Varnito richtet sich im aktuellen Angebotsmodell ausschließlich an Unternehmen. Für dieses B2B-Angebot besteht daher kein gesetzliches Widerrufsrecht für Verbraucherbestellungen.
        </p>
      </header>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Geltungsbereich</h2>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
          Sollte Varnito künftig gegenüber Verbrauchern angeboten werden, müssen Widerrufsbelehrung, Muster-Widerrufsformular und die zugehörigen Prozesse vor Freischaltung dieses Angebots ergänzt werden.
        </p>
      </section>

      <LegalFooter />
    </main>
  );
}
