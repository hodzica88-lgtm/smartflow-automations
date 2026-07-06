import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <span className={styles.badge}>SmartFlow</span>

        <h1>
          Mehr Kunden.
          <br />
          Weniger Aufwand.
        </h1>

        <p>
          SmartFlow sammelt Kundenanfragen automatisch, organisiert Leads,
          erinnert an offene Aufgaben und hilft Unternehmen dabei, keine Anfrage
          mehr zu verlieren.
        </p>

        <div className={styles.actions}>
          <a href="/login" className={styles.primary}>
            Kostenlos starten
          </a>

          <a href="#features" className={styles.secondary}>
            Mehr erfahren
          </a>
        </div>
      </section>

      <section id="features" className={styles.features}>
        <div className={styles.card}>
          <h3>Kundenanfragen</h3>
          <p>Alle Anfragen landen automatisch an einem Ort.</p>
        </div>

        <div className={styles.card}>
          <h3>Automatisierungen</h3>
          <p>E-Mails, Erinnerungen und Workflows laufen automatisch.</p>
        </div>

        <div className={styles.card}>
          <h3>Dashboard</h3>
          <p>Offene Leads, Erinnerungen und Aktivitäten auf einen Blick.</p>
        </div>

        <div className={styles.card}>
          <h3>Für Dienstleister</h3>
          <p>Ideal für Handwerker, Friseure, Barber, Werkstätten und viele weitere Branchen.</p>
        </div>
      </section>
    </main>
  );
}