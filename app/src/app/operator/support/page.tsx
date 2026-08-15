import Link from "next/link";

import { requireOperatorUser } from "@/features/operator/access";
import { getSupportDashboardOverview, listSupportThreads } from "@/features/support/service";
import { getRequestMarket } from "@/shared/i18n/request";

import styles from "./support.module.css";

const statusLabelMap = {
  open: "Open",
  ai_answered: "AI answered",
  escalated: "Escalated",
  waiting_customer: "Waiting customer",
  resolved: "Resolved",
};

const formatDate = (value: string | null, market: "de" | "us") => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(market === "us" ? "en-US" : "de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

export default async function SupportOverviewPage() {
  await requireOperatorUser({ nextPath: "/operator/support" });
  const { market } = await getRequestMarket();
  const [overview, threads] = await Promise.all([
    getSupportDashboardOverview(),
    listSupportThreads(),
  ]);

  return (
    <main className={styles.shell}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Support</p>
          <h1 className={styles.title}>Varnito support</h1>
        </div>
        <div className={styles.actions}>
          <Link href="/operator/owner" className={styles.linkButton}>Owner control center</Link>
          <Link href="/operator" className={styles.linkButton}>Operator</Link>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}><p>Open</p><strong>{overview.open}</strong></article>
        <article className={styles.card}><p>Escalated</p><strong>{overview.escalated}</strong></article>
        <article className={styles.card}><p>AI answered</p><strong>{overview.ai_answered}</strong></article>
        <article className={styles.card}><p>Waiting customer</p><strong>{overview.waiting_customer}</strong></article>
        <article className={styles.card}><p>Resolved</p><strong>{overview.resolved}</strong></article>
      </section>

      <section className={styles.panel}>
        <div className={styles.tableHeader}>
          <h2>Threads</h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Subject</th>
                <th>Language</th>
                <th>Category</th>
                <th>Status</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {threads.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>No support threads yet.</td>
                </tr>
              ) : (
                threads.map((thread) => (
                  <tr key={String(thread.id)}>
                    <td>{formatDate(String(thread.last_message_at ?? thread.created_at), market)}</td>
                    <td>
                      <Link href={`/operator/support/${thread.id}`} className={styles.linkInline}>
                        {String(thread.customer_email)}
                      </Link>
                    </td>
                    <td>{String(thread.subject)}</td>
                    <td>{String(thread.locale).toUpperCase()}</td>
                    <td>{String(thread.category)}</td>
                    <td>{statusLabelMap[String(thread.status) as keyof typeof statusLabelMap] ?? String(thread.status)}</td>
                    <td>{String(thread.priority)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
