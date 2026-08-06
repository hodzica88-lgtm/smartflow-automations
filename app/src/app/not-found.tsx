import Link from "next/link";

import VarnitoLogo from "@/shared/ui/VarnitoLogo";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "min(100%, 560px)", display: "grid", gap: 14, border: "1px solid var(--border)", borderRadius: 20, padding: 22, background: "linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.01))", boxShadow: "var(--shadow-xl)" }}>
        <VarnitoLogo subtitle="404" />
        <h1 style={{ margin: 0, fontSize: 44 }}>Seite nicht gefunden</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.65 }}>
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="premium-button" href="/">
            Zur Startseite
          </Link>
          <Link className="premium-button premium-button-secondary" href="/dashboard">
            Zum Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}