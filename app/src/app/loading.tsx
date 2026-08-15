"use client";

export default function Loading() {
  const market = typeof window !== "undefined" && window.location.hostname.endsWith("varnito.com") ? "us" : "de";

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "min(100%, 420px)", border: "1px solid var(--border)", borderRadius: 20, padding: 22, background: "linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.01))", boxShadow: "var(--shadow-xl)", display: "grid", gap: 10 }}>
        <div style={{ height: 14, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ width: "48%", height: "100%", background: "linear-gradient(90deg, rgba(212,175,55,0.2), rgba(212,175,55,0.7), rgba(212,175,55,0.2))", animation: "premium-shimmer 1.2s linear infinite" }} />
        </div>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {market === "us" ? "Varnito is loading the interface…" : "Varnito lädt die Oberfläche…"}
        </p>
      </section>
    </main>
  );
}