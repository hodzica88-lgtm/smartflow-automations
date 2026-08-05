import Link from "next/link";

import { LEGAL_CONTACT_EMAIL, LEGAL_LINKS } from "@/shared/config/site";

export default function LegalFooter() {
  return (
    <footer style={{ width: "min(100%, 72rem)", margin: "0 auto", padding: "1.5rem 1rem 2rem", color: "#667085" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
        <nav aria-label="Rechtliches" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {LEGAL_LINKS.map((entry) =>
            entry.href.startsWith("/") ? (
              <Link key={entry.href} href={entry.href} style={{ color: "#0f766e", fontWeight: 700 }}>
                {entry.label}
              </Link>
            ) : (
              <a key={entry.href} href={entry.href} style={{ color: "#0f766e", fontWeight: 700 }}>
                {entry.label}
              </a>
            ),
          )}
        </nav>
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} style={{ color: "#0f766e", fontWeight: 700 }}>
          {LEGAL_CONTACT_EMAIL}
        </a>
      </div>
    </footer>
  );
}
