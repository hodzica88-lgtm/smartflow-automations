import Link from "next/link";

import { requireOperatorUser } from "@/features/operator/access";
import { getSupportDashboardOverview, getSupportInboxCounts, listSupportThreads } from "@/features/support/service";
import { getRequestMarket } from "@/shared/i18n/request";

import styles from "./support.module.css";

const bucketLabels = {
  important: { us: "Important", de: "Wichtig" },
  review: { us: "Review", de: "Prüfen" },
  sales: { us: "Sales", de: "Verkauf" },
  spam: { us: "Spam", de: "Spam" },
  all: { us: "All", de: "Alle" },
} as const;

const triageCategoryLabels = {
  customer_support: { us: "Customer support", de: "Kundensupport" },
  potential_customer: { us: "Potential customer", de: "Potenzieller Kunde" },
  billing: { us: "Billing", de: "Abrechnung" },
  security: { us: "Security", de: "Sicherheit" },
  legal_privacy: { us: "Legal / Privacy", de: "Recht / Datenschutz" },
  partnership: { us: "Partnership", de: "Partnerschaft" },
  vendor_sales: { us: "Vendor sales", de: "Verkauf" },
  spam: { us: "Spam", de: "Spam" },
  unclear: { us: "Unclear", de: "Unklar" },
} as const;

const triageActionLabels = {
  respond: { us: "Respond", de: "Antworten" },
  review: { us: "Review", de: "Prüfen" },
  ignore: { us: "Ignore", de: "Ignorieren" },
} as const;

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

const formatTriageBucket = (value: unknown, market: "de" | "us") => {
  const bucket = typeof value === "string" ? value.toLowerCase() : "review";
  const label = bucketLabels[bucket as keyof typeof bucketLabels];
  return label ? label[market] : bucketLabels.review[market];
};

const formatTriageCategory = (value: unknown, market: "de" | "us") => {
  const category = typeof value === "string" ? value.toLowerCase() : "unclear";
  const label = triageCategoryLabels[category as keyof typeof triageCategoryLabels];
  return label ? label[market] : triageCategoryLabels.unclear[market];
};

const formatTriageAction = (value: unknown, market: "de" | "us") => {
  const action = typeof value === "string" ? value.toLowerCase() : "review";
  const label = triageActionLabels[action as keyof typeof triageActionLabels];
  return label ? label[market] : triageActionLabels.review[market];
};

export default async function SupportOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOperatorUser({ nextPath: "/operator/support" });
  const { market } = await getRequestMarket();
  const resolvedParams = searchParams ? await searchParams : {};
  const activeFilter = typeof resolvedParams.filter === "string" ? resolvedParams.filter.toLowerCase() : "all";
  const normalizedFilter = ["all", "important", "review", "sales", "spam"].includes(activeFilter) ? activeFilter : "all";

  const [overview, counts, threads] = await Promise.all([
    getSupportDashboardOverview(),
    getSupportInboxCounts(),
    listSupportThreads(normalizedFilter as "all" | "important" | "review" | "sales" | "spam"),
  ]);

  return (
    <main className={styles.shell}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Support</p>
          <h1 className={styles.title}>{market === "us" ? "Mail Inbox" : "Mail Inbox"}</h1>
        </div>
        <div className={styles.actions}>
          <Link href="/operator/owner" className={styles.linkButton}>Owner control center</Link>
          <Link href="/operator" className={styles.linkButton}>Operator</Link>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}><p>{market === "us" ? "Open" : "Offen"}</p><strong>{overview.open}</strong></article>
        <article className={styles.card}><p>{market === "us" ? "Important" : "Wichtig"}</p><strong>{counts.important}</strong></article>
        <article className={styles.card}><p>{market === "us" ? "Review" : "Prüfen"}</p><strong>{counts.review}</strong></article>
        <article className={styles.card}><p>{market === "us" ? "Sales" : "Verkauf"}</p><strong>{counts.sales}</strong></article>
        <article className={styles.card}><p>{market === "us" ? "Spam" : "Spam"}</p><strong>{counts.spam}</strong></article>
      </section>

      <section className={styles.panel}>
        <div className={styles.tableHeader}>
          <h2>{market === "us" ? "Inbox" : "Posteingang"}</h2>
          <div className={styles.filterBar}>
            {(["all", "important", "review", "sales", "spam"] as const).map((filter) => (
              <Link
                key={filter}
                href={`/operator/support?filter=${filter}`}
                className={normalizedFilter === filter ? styles.filterButtonActive : styles.filterButton}
              >
                {filter === "all" ? bucketLabels.all[market] : bucketLabels[filter][market]}
              </Link>
            ))}
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{market === "us" ? "Date" : "Datum"}</th>
                <th>{market === "us" ? "Sender" : "Absender"}</th>
                <th>{market === "us" ? "Subject" : "Betreff"}</th>
                <th>{market === "us" ? "Bucket" : "Einstufung"}</th>
                <th>{market === "us" ? "Category" : "Kategorie"}</th>
                <th>{market === "us" ? "Action" : "Aktion"}</th>
                <th>{market === "us" ? "Summary" : "Zusammenfassung"}</th>
              </tr>
            </thead>
            <tbody>
              {threads.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>{market === "us" ? "No inbox mail yet." : "Noch keine Mails im Posteingang."}</td>
                </tr>
              ) : (
                threads.map((thread) => (
                  <tr key={String(thread.id)}>
                    <td>{formatDate(String(thread.last_message_at ?? thread.created_at), market)}</td>
                    <td>
                      <Link href={`/operator/support/${thread.id}`} className={styles.linkInline}>
                        {String(thread.customer_email ?? "Unknown sender")}
                      </Link>
                    </td>
                    <td>{String(thread.subject ?? "Support request")}</td>
                    <td>
                      <span className={styles.badge}>{formatTriageBucket(thread.triage_bucket ?? "review", market)}</span>
                    </td>
                    <td>{formatTriageCategory(thread.triage_category ?? thread.category ?? "unclear", market)}</td>
                    <td>{formatTriageAction(thread.triage_action ?? "review", market)}</td>
                    <td className={styles.summaryCell}>{String(thread.triage_summary ?? thread.subject ?? "No summary")}</td>
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
