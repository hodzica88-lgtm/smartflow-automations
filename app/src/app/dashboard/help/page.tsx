import HelpCenterClient from "./HelpCenterClient";

export default function HelpPage() {
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }}>
      <section>
        <p style={{ margin: 0, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Hilfe
        </p>
        <h1 style={{ margin: "6px 0" }}>Dokumentation</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Kurze Anleitungen fuer den taeglichen Betrieb.
        </p>
      </section>

      <HelpCenterClient />
    </main>
  );
}