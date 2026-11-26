import type { Metadata } from "next";
import Link from "next/link";

import PartnerApplicationForm from "@/features/partners/PartnerApplicationForm";
import { getRequestMarket } from "@/shared/i18n/request";
import LegalFooter from "@/shared/ui/LegalFooter";
import VarnitoLogo from "@/shared/ui/VarnitoLogo";

export const metadata: Metadata = {
  title: "Partner program | Varnito",
  description: "Recommend Varnito to your clients and earn recurring commissions.",
};

export default async function PartnerPage() {
  const { market } = await getRequestMarket();
  const isUs = market === "us";

  const heading = isUs ? "Become a Partner" : "Partner werden";
  const subheading = isUs
    ? "Recommend Varnito to your own clients and earn recurring commissions for qualifying, active paying referrals."
    : "Empfehlen Sie Varnito Ihren eigenen Kunden und erhalten Sie wiederkehrende Provisionen für qualifizierte, aktive und zahlende Empfehlungen.";
  const benefits = isUs
    ? [
        "Offer Varnito to your clients without changing their existing pricing or billing flows.",
        "Earn recurring commissions for qualifying referrals that remain active and paying.",
        "Work with a straightforward review process and a clear, professional partnership setup.",
      ]
    : [
        "Bieten Sie Varnito Ihren Kunden an, ohne bestehende Preise oder Zahlungsabläufe zu verändern.",
        "Erhalten Sie wiederkehrende Provisionen für qualifizierte Empfehlungen, die aktiv und zahlend bleiben.",
        "Arbeiten Sie mit einem klaren, professionellen Bewerbungsverfahren und einer transparenten Prüfung.",
      ];

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at top, rgba(216,186,114,0.12), transparent 35%), #0f1115", color: "#f4f1ea" }}>
      <header style={{ width: "min(100%, 78rem)", margin: "0 auto", padding: "1.25rem 1.25rem 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <VarnitoLogo subtitle={isUs ? "Lead Operating System" : "Lead-Betriebssystem"} />
        <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "var(--text)", fontWeight: 700 }}>Home</Link>
          <Link href="/registrierung" style={{ color: "var(--text)", fontWeight: 700 }}>{isUs ? "Start trial" : "Test starten"}</Link>
          <Link href="/datenschutz" style={{ color: "var(--text)", fontWeight: 700 }}>{isUs ? "Privacy" : "Datenschutz"}</Link>
        </nav>
      </header>

      <section style={{ width: "min(100%, 78rem)", margin: "0 auto", padding: "3rem 1.25rem 1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 18 }}>
          <span style={{ color: "#d8ba72", textTransform: "uppercase", letterSpacing: 1.4, fontSize: 12, fontWeight: 800 }}>{isUs ? "Partnership" : "Partnerschaft"}</span>
          <h1 style={{ margin: 0, fontSize: "clamp(2.3rem, 7vw, 4.5rem)", lineHeight: 1.05 }}>{heading}</h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "1.08rem", lineHeight: 1.7 }}>{subheading}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#partner-form" style={{ background: "linear-gradient(135deg, #d8ba72, #b68a2d)", color: "#171511", borderRadius: 999, padding: "0.9rem 1.5rem", fontWeight: 800, textDecoration: "none" }}>
              {isUs ? "Apply now" : "Jetzt bewerben"}
            </a>
            <Link href="/kontakt" style={{ border: "1px solid var(--border)", borderRadius: 999, padding: "0.9rem 1.5rem", fontWeight: 700, textDecoration: "none", color: "var(--text)" }}>
              {isUs ? "Contact us" : "Kontakt"}
            </Link>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(216,186,114,0.35)", background: "rgba(18, 21, 28, 0.7)", borderRadius: 24, padding: 24, boxShadow: "0 24px 70px rgba(0,0,0,0.2)" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.3rem" }}>{isUs ? "What the program offers" : "Was das Programm bietet"}</h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 14, lineHeight: 1.7, color: "var(--muted)" }}>
            {benefits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p style={{ margin: "1.25rem 0 0", color: "var(--muted)" }}>
            {isUs
              ? "Existing Varnito prices, product setup, and checkout flows remain unchanged. The partnership is separate from the customer subscription process."
              : "Bestehende Varnito-Preise, Produkt- und Checkout-Abläufe bleiben unverändert. Das Partnerprogramm ist separat vom Kunden-Abonnement."}
          </p>
        </div>
      </section>

      <section style={{ width: "min(100%, 78rem)", margin: "0 auto", padding: "1.5rem 1.25rem 0", display: "grid", gap: 28 }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: 24, background: "rgba(255,255,255,0.02)", padding: 24 }} id="partner-form">
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: 0, color: "#d8ba72", textTransform: "uppercase", letterSpacing: 1.3, fontSize: 12, fontWeight: 800 }}>{isUs ? "Application" : "Bewerbung"}</p>
            <h2 style={{ margin: "0.5rem 0 0", fontSize: "2rem" }}>{isUs ? "Apply to become a Varnito partner" : "Bewerben Sie sich als Varnito-Partner"}</h2>
          </div>
          <PartnerApplicationForm market={market} />
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}
