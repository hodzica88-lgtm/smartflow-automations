"use client";

import Link from "next/link";
import { useEffect } from "react";

import VarnitoLogo from "@/shared/ui/VarnitoLogo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const market = typeof window !== "undefined" && window.location.hostname.endsWith("varnito.com") ? "us" : "de";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "min(100%, 560px)", display: "grid", gap: 14, border: "1px solid var(--border)", borderRadius: 20, padding: 22, background: "linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.01))", boxShadow: "var(--shadow-xl)" }}>
            <VarnitoLogo subtitle="500" />
            <h1 style={{ margin: 0, fontSize: 44 }}>{market === "us" ? "Something went wrong" : "Ein Fehler ist aufgetreten"}</h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.65 }}>
              {market === "us"
                ? "Please refresh the page. If the issue continues, try again later."
                : "Bitte laden Sie die Seite erneut. Falls der Fehler bleibt, versuchen Sie es später noch einmal."}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="premium-button" onClick={reset} type="button">
                {market === "us" ? "Try again" : "Erneut versuchen"}
              </button>
              <Link className="premium-button premium-button-secondary" href="/">
                {market === "us" ? "Back to home" : "Zur Startseite"}
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}