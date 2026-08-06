"use client";

import Link from "next/link";

import { useDemo } from "@/features/demo/useDemo";
import styles from "@/features/demo/demo.module.css";

const fmtDate = (value: string, locale: "de-DE" | "en-US") =>
  new Date(value).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });

export default function DemoDashboardPage() {
  const { state } = useDemo();
  const locale = state.market === "us" ? "en-US" : "de-DE";

  const totals = state.leads.reduce(
    (acc, lead) => {
      acc[lead.status] += 1;
      return acc;
    },
    { new: 0, contacted: 0, successful: 0, unsuccessful: 0 },
  );

  const openLeads = state.leads.filter((lead) => lead.status === "new" || lead.status === "contacted");

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.badge} style={{ margin: 0 }}>Demo-Unternehmen</p>
        <h1 style={{ margin: 0 }}>{state.companyName}</h1>
        <p className={styles.muted}>
          {state.market === "us"
            ? "Explore the product flow with realistic sample data."
            : "Erleben Sie den Produkt-Flow mit realistischen Beispieldaten."}
        </p>
        <div className={styles.row}>
          <Link className={styles.button} href="/demo/leads">Leads</Link>
          <Link className={styles.buttonSecondary} href="/demo/settings">Einstellungen</Link>
        </div>
      </section>

      <section className={`${styles.grid} ${styles.three}`}>
        <article className={styles.card}>
          <p className={styles.muted}>Neue Anfragen</p>
          <p className={styles.kpi}>{totals.new}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.muted}>Kontaktiert</p>
          <p className={styles.kpi}>{totals.contacted}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.muted}>Erfolgreich</p>
          <p className={styles.kpi}>{totals.successful}</p>
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.row} style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Offene Anfragen</h2>
          <Link href="/demo/leads" className={styles.buttonSecondary}>Alle Leads</Link>
        </div>

        <div className={styles.grid}>
          {openLeads.map((lead) => (
            <Link key={lead.id} href={`/demo/leads/${lead.id}`} className={styles.card}>
              <div className={styles.row} style={{ justifyContent: "space-between" }}>
                <strong>{lead.firstName} {lead.lastName}</strong>
                <span className={styles.badge}>{lead.status}</span>
              </div>
              <p className={styles.muted}>{lead.inquiryType}</p>
              <p className={styles.muted}>{fmtDate(lead.createdAt, locale)}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
