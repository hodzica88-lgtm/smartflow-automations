"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getDemoCopy } from "@/features/demo/copy";
import { useDemo } from "@/features/demo/useDemo";
import styles from "@/features/demo/demo.module.css";

const fmtDate = (value: string, locale: "de-DE" | "en-US") =>
  new Date(value).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });

export default function DemoDashboardPage() {
  const { state } = useDemo();
  const copy = getDemoCopy(state.market);
  const searchParams = useSearchParams();
  const locale = state.market === "us" ? "en-US" : "de-DE";
  const isHighlighted = searchParams.get("highlight") === "dashboard";

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
      <section className={`${styles.hero} ${isHighlighted ? styles.highlightedSection : ""}`}>
        <p className={styles.badge} style={{ margin: 0 }}>{copy.demoCompanyLabel}</p>
        <h1 style={{ margin: 0 }}>{state.companyName}</h1>
        <p className={styles.muted}>{copy.dashboard.description}</p>
        <div className={styles.row}>
          <Link className={styles.button} href="/demo/leads">{copy.dashboard.toLeads}</Link>
          <Link className={styles.buttonSecondary} href="/demo/settings">{copy.dashboard.toSettings}</Link>
        </div>
      </section>

      <section className={`${styles.grid} ${styles.three}`}>
        <article className={styles.card}>
          <p className={styles.muted}>{copy.dashboard.newLeads}</p>
          <p className={styles.kpi}>{totals.new}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.muted}>{copy.dashboard.contacted}</p>
          <p className={styles.kpi}>{totals.contacted}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.muted}>{copy.dashboard.successful}</p>
          <p className={styles.kpi}>{totals.successful}</p>
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.row} style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>{copy.dashboard.openInquiries}</h2>
          <Link href="/demo/leads" className={styles.buttonSecondary}>{copy.dashboard.allLeads}</Link>
        </div>

        <div className={styles.grid}>
          {openLeads.map((lead) => (
            <Link key={lead.id} href={`/demo/leads/${lead.id}`} className={styles.card}>
              <div className={styles.row} style={{ justifyContent: "space-between" }}>
                <strong>{lead.firstName} {lead.lastName}</strong>
                <span className={styles.badge}>{copy.leadStatusLabels[lead.status]}</span>
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
