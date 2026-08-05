import Link from "next/link";

import LegalFooter from "@/shared/ui/LegalFooter";

import styles from "./page.module.css";

const FEATURES = [
  "Keine Anfrage übersehen",
  "Schneller reagieren",
  "Klare Teamuebersicht",
  "Weniger Verwaltungsaufwand",
  "Ergebnisse der letzten 30 Tage sehen",
  "Keine komplizierte CRM-Einfuehrung",
] as const;

const FUNCTIONS = [
  {
    title: "Anfragen sichern",
    text: "Website-Anfragen landen geordnet im Dashboard und werden nicht nur in einzelnen Postfaechern gesucht.",
  },
  {
    title: "Sofort informieren",
    text: "Neue Anfragen werden intern weitergegeben, damit der Betrieb schneller reagieren kann.",
  },
  {
    title: "Status nachvollziehen",
    text: "Der Bearbeitungsstand bleibt sichtbar, damit das Team weiss, was schon erledigt ist.",
  },
  {
    title: "Ergebnisse auswerten",
    text: "Die letzten 30 Tage sind im Dashboard schnell sichtbar, ohne auf schwere Berichte umzusteigen.",
  },
] as const;

const FAQ = [
  {
    question: "Was ist Varnito?",
    answer:
      "Varnito ist eine schlanke Software fuer Betriebe mit Website-Anfragen. Sie hilft dabei, Anfragen zu sichern, zuzuordnen und im Team zu bearbeiten.",
  },
  {
    question: "Ist Varnito ein CRM?",
    answer:
      "Nein. Varnito bleibt bewusst einfach und ersetzt kein klassisches CRM-System.",
  },
  {
    question: "Wie funktioniert die 30-Tage-Testphase?",
    answer:
      "Sie legen ein Konto an, starten die Testphase und koennen Varnito 30 Tage ohne Anfangszahlung pruefen. Die erste Zahlung erfolgt erst nach dem Testende, wenn Sie aktiv weiternutzen.",
  },
  {
    question: "Muss ich meine Website ersetzen?",
    answer:
      "Nein. Varnito wird neben Ihrer bestehenden Website eingesetzt und ergaenzt den bestehenden Anfrageprozess.",
  },
  {
    question: "Koennen Mitarbeiter mitarbeiten?",
    answer:
      "Ja. Mitarbeiter koennen eingeladen werden und im Team mitarbeiten.",
  },
  {
    question: "Kann ich jederzeit kuendigen?",
    answer:
      "Ja. Sie kuendigen im Billing-Bereich oder im Stripe-Kundenportal. Die Nutzung bleibt bis zum Ende der laufenden Periode verfuegbar.",
  },
  {
    question: "Was passiert nach einer Kuendigung?",
    answer:
      "Ihr Zugriff endet nach der gebuchten Periode. Ihre Daten bleiben nicht durch Marketing geloescht, sondern folgen den geltenden Aufbewahrungs- und Loeschregeln.",
  },
  {
    question: "Wie werden meine Daten geschuetzt?",
    answer:
      "Varnito nutzt Mandantentrennung, Supabase, Stripe und technisch notwendige Authentifizierung. Es werden keine unnötigen Tracking-Dienste eingesetzt.",
  },
  {
    question: "Wie wird Varnito in meine Website eingebunden?",
    answer:
      "Der Anfrage-Link kann einfach als Formular- oder Button-Ziel genutzt werden. Eine komplexe Installation ist nicht erforderlich.",
  },
  {
    question: "Brauche ich technische Kenntnisse?",
    answer:
      "Nein. Die Nutzung ist fuer kleine Teams gedacht und im Alltag selbsterklaerend.",
  },
] as const;

export default function Home() {
  return (
    <main className={styles.page} id="top">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Varnito.de fuer Betriebe mit Website-Anfragen</p>
          <h1>Keine Kundenanfrage mehr verlieren.</h1>
          <p className={styles.lead}>
            Varnito sichert eingehende Anfragen, informiert den Betrieb sofort und macht den Bearbeitungsstatus im Team klar nachvollziehbar.
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/registrierung">
              30 Tage kostenlos testen
            </Link>
            <a className={styles.secondaryButton} href="#so-funktioniert">
              So funktioniert Varnito
            </a>
          </div>

          <p className={styles.supportingText}>
            Fuer Handwerksbetriebe und kleine Dienstleistungsunternehmen mit etwa 1 bis 20 Mitarbeitern.
          </p>
        </div>

        <div className={styles.heroPanel} aria-label="Produktvorschau">
          <div className={styles.previewCard}>
            <span className={styles.previewLabel}>Dashboard</span>
            <strong>Neue Anfrage</strong>
            <p>Eine zentrale Ansicht fuer offene Leads, Status und letzte 30 Tage.</p>
          </div>
          <div className={styles.previewCard}>
            <span className={styles.previewLabel}>Leads</span>
            <strong>Bearbeitung im Team</strong>
            <p>Status und Ergebnis bleiben fuer alle Beteiligten nachvollziehbar.</p>
          </div>
          <div className={styles.previewCard}>
            <span className={styles.previewLabel}>Billing</span>
            <strong>30 Tage Testphase</strong>
            <p>Transparent, ohne versteckte Gebuehren oder unnötige Produktversprechen.</p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="problem-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Problem</p>
          <h2 id="problem-title">Anfragen gehen im Alltag unter.</h2>
        </div>

        <div className={styles.gridThree}>
          <article className={styles.featureCard}>
            <h3>E-Mails und Formulare werden unuebersichtlich</h3>
            <p>Anfragen liegen verstreut in Postfaechern, auf dem Handy oder auf einzelnen Zetteln.</p>
          </article>
          <article className={styles.featureCard}>
            <h3>Langsame Antworten kosten Zeit</h3>
            <p>Wer zu spaet reagiert, verliert moeglicherweise Auftraege an schnellere Mitbewerber.</p>
          </article>
          <article className={styles.featureCard}>
            <h3>Im Team fehlt eine gemeinsame Sicht</h3>
            <p>Ohne klare Uebersicht ist oft unklar, wer sich bereits um eine Anfrage kuemmert.</p>
          </article>
        </div>
      </section>

      <section id="so-funktioniert" className={styles.section} aria-labelledby="solution-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Loesung</p>
          <h2 id="solution-title">So funktioniert Varnito.</h2>
        </div>

        <div className={styles.timeline}>
          <div className={styles.timelineStep}>
            <span>1</span>
            <div>
              <h3>Anfrage geht ein</h3>
              <p>Die Anfrage kommt aus Ihrer Website oder dem Kontaktformular ins System.</p>
            </div>
          </div>
          <div className={styles.timelineStep}>
            <span>2</span>
            <div>
              <h3>Betrieb wird informiert</h3>
              <p>Neue Anfragen werden intern weitergegeben, damit niemand lange suchen muss.</p>
            </div>
          </div>
          <div className={styles.timelineStep}>
            <span>3</span>
            <div>
              <h3>Bearbeitung bleibt nachvollziehbar</h3>
              <p>Im Dashboard sehen Sie Status, Teamzugriffe und die letzten Ergebnisse auf einen Blick.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="benefits-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Vorteile</p>
          <h2 id="benefits-title">Nur echte Kundenvorteile.</h2>
        </div>

        <div className={styles.benefitsGrid}>
          {FEATURES.map((feature) => (
            <div key={feature} className={styles.benefitChip}>
              {feature}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="functions-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Funktionen</p>
          <h2 id="functions-title">Nur das, was heute schon existiert.</h2>
        </div>

        <div className={styles.gridTwo}>
          {FUNCTIONS.map((entry) => (
            <article key={entry.title} className={styles.featureCard}>
              <h3>{entry.title}</h3>
              <p>{entry.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="views-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Produktansichten</p>
          <h2 id="views-title">Echte Produktbereiche statt erfundener Referenzen.</h2>
        </div>

        <div className={styles.viewsGrid}>
          <article className={styles.viewCard}>
            <span className={styles.previewLabel}>Startseite</span>
            <strong>Vertrieb und Einstieg</strong>
            <p>Diese Seite zeigt, wie Varnito ohne CRM-Sprache die Anfragebearbeitung vereinfacht.</p>
          </article>
          <article className={styles.viewCard}>
            <span className={styles.previewLabel}>Dashboard</span>
            <strong>Leads und Status</strong>
            <p>Im internen Bereich werden offene Anfragen und Auswertungen sichtbar.</p>
          </article>
          <article className={styles.viewCard}>
            <span className={styles.previewLabel}>Billing</span>
            <strong>Testphase und Abo</strong>
            <p>Der Billing-Bereich regelt den Zugang transparent und ohne versteckte Zusatzoptionen.</p>
          </article>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="pricing-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Preis</p>
          <h2 id="pricing-title">Varnito Pro fuer 299 EUR pro Monat.</h2>
        </div>

        <article className={styles.pricingCard}>
          <div>
            <p className={styles.pricingLabel}>Varnito Pro</p>
            <strong className={styles.price}>299 EUR / Monat</strong>
            <p className={styles.pricingCopy}>
              Neue Firmen starten mit 30 Tagen kostenloser Testphase. Die erste Zahlung erfolgt erst, wenn die Testphase endet und Sie das Abo aktiv weiternutzen.
            </p>
          </div>
          <div className={styles.pricingMeta}>
            <span>Keine versteckten Gebuehren</span>
            <span>Abrechnung transparent im Billing-Bereich</span>
            <span>Umsatzsteuer wird entsprechend der tatsaechlichen Preislogik ausgewiesen</span>
          </div>
        </article>
      </section>

      <section className={styles.section} aria-labelledby="faq-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>FAQ</p>
          <h2 id="faq-title">Haeufige Fragen.</h2>
        </div>

        <div className={styles.faqGrid}>
          {FAQ.map((entry) => (
            <article key={entry.question} className={styles.faqCard}>
              <h3>{entry.question}</h3>
              <p>{entry.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.ctaBand} aria-labelledby="cta-title">
        <div>
          <p className={styles.sectionEyebrow}>Jetzt starten</p>
          <h2 id="cta-title">30 Tage kostenlos testen.</h2>
          <p>
            Ohne künstliche Verknappung, ohne Countdown und ohne unnötige Versprechen.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/registrierung">
            30 Tage kostenlos testen
          </Link>
          <a className={styles.secondaryButton} href="#top">
            Nach oben
          </a>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}