import type { Metadata } from "next";

import LegalFooter from "@/shared/ui/LegalFooter";
import { SITE_DOMAIN } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Widerruf | Varnito",
  alternates: { canonical: `${SITE_DOMAIN}/widerruf` },
  robots: { index: true, follow: true },
};

export default function WiderrufPage() {
  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "40px 20px", display: "grid", gap: 24 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "#0f766e", fontWeight: 700 }}>Rechtliches</p>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05 }}>Widerruf</h1>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          Varnito richtet sich nach dem aktuellen Produktstand an Unternehmen. Ein Widerrufsrecht ist daher vor Veröffentlichung rechtlich zu prüfen und nur dann bereitzustellen, wenn tatsächlich ein Verbraucherangebot entsteht.
        </p>
      </header>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Hinweis</h2>
        <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
          Diese Seite ist als Platzhalter vorhanden, damit sie bei Bedarf schnell aktiviert werden kann. Vor einem Livegang muss sie von einer rechtlichen Fachstelle bewertet werden.
        </p>
      </section>

      <LegalFooter />
    </main>
  );
}
