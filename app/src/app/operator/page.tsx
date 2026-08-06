import Link from "next/link";

import { logoutAction } from "@/features/auth/actions";
import { activateCompanyAction, deactivateCompanyAction } from "@/features/operator/actions";
import { requireOperatorUser } from "@/features/operator/access";
import {
  getOperatorDashboardData,
  type OperatorCompany,
} from "@/features/operator/data";
import { OPERATOR_COPY } from "@/shared/i18n/dashboard";
import { getRequestMarket } from "@/shared/i18n/request";

import styles from "./operator.module.css";

export const dynamic = "force-dynamic";

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Noch keine";
  }

  try {
    return new Date(value).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

const getCompanyStatus = (company: OperatorCompany) => {
  if (company.deletedAt) {
    return { label: "Deaktiviert", tone: "neutral" } as const;
  }

  if (company.staleProcessingNotifications > 0) {
    return { label: "Kritisch", tone: "danger" } as const;
  }

  if (company.failedNotifications7d > 0) {
    return { label: "Prüfen", tone: "warning" } as const;
  }

  return { label: "In Ordnung", tone: "success" } as const;
};

const formatSubscription = (company: OperatorCompany) => {
  if (!company.subscriptionStatus) {
    return "Kein Abo";
  }

  const plan = company.subscriptionPlan ?? "ohne Tarif";
  return `${plan} · ${company.subscriptionStatus}`;
};

type OperatorPageProps = {
  searchParams?: Promise<{ q?: string; success?: string; error?: string }>;
};

export default async function OperatorPage({ searchParams }: OperatorPageProps) {
  const { market } = await getRequestMarket();
  const copy = OPERATOR_COPY[market];
  const operator = await requireOperatorUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { metrics, companies } = await getOperatorDashboardData();
  const query = resolvedSearchParams?.q?.trim().toLowerCase() ?? "";
  const filteredCompanies = query
    ? companies.filter((company) =>
        [company.name, company.email, company.subscriptionStatus ?? "", company.subscriptionPlan ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : companies;

  return (
    <main className={styles.shell}>
      <section className={styles.header} aria-labelledby="operator-title">
        <div>
          <p className={styles.eyebrow}>{copy.sectionLabel}</p>
          <h1 className={styles.title} id="operator-title">
            {copy.title}
          </h1>
          <p className={styles.copy}>
            {copy.copy}
          </p>
          <p className={styles.operatorIdentity}>Angemeldet als {operator.email ?? operator.id}</p>
        </div>

        <div className={styles.actions}>
          <Link className={styles.secondaryButton} href="/dashboard">
            {copy.toCustomerDashboard}
          </Link>
          <form action={logoutAction}>
            <button className={styles.primaryButton} type="submit">
              {copy.logout}
            </button>
          </form>
        </div>
      </section>

      <section className={styles.companySection} aria-label="Suche">
        <form method="get" className={styles.sectionHeader}>
          <div>
            <h2>{copy.searchTitle}</h2>
            <p>{copy.searchCopy}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className={styles.searchInput}
              name="q"
              defaultValue={resolvedSearchParams?.q ?? ""}
              placeholder={copy.searchPlaceholder}
            />
            <button className={styles.primaryButton} type="submit">
              {copy.searchButton}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.metrics} aria-label="Betreiberkennzahlen">
        <article className={styles.metricCard}>
          <p>{copy.metrics.activeCompanies}</p>
          <strong>{metrics.activeCompanies}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>{copy.metrics.totalUsers}</p>
          <strong>{metrics.totalUsers}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>{copy.metrics.leadsLast30d}</p>
          <strong>{metrics.leadsLast30d}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>{copy.metrics.errorsLast24h}</p>
          <strong>{metrics.failedNotifications24h}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>{copy.metrics.dueQueue}</p>
          <strong>{metrics.dueNotifications}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>{copy.metrics.companiesNeedingAttention}</p>
          <strong>{metrics.companiesNeedingAttention}</strong>
        </article>
      </section>

      {metrics.staleProcessingNotifications > 0 ? (
        <section className={styles.alert} role="alert">
          <strong>Kritischer Queue-Hinweis</strong>
          <p>
            {metrics.staleProcessingNotifications} Benachrichtigung(en) befinden sich
            seit mehr als zehn Minuten im Status „processing“.
          </p>
        </section>
      ) : null}

      <section className={styles.companySection} aria-labelledby="companies-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="companies-title">Kundenunternehmen</h2>
            <p>Die neuesten 100 Unternehmen, sortiert nach Erstellungsdatum.</p>
          </div>
          <span>{filteredCompanies.length} angezeigt</span>
        </div>

        {filteredCompanies.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>Noch keine Unternehmen</h3>
            <p>Sobald sich ein Kunde registriert, erscheint er hier.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Unternehmen</th>
                  <th>Systemstatus</th>
                  <th>Benutzer</th>
                  <th>Leads</th>
                  <th>Letzter Lead</th>
                  <th>Benachrichtigungen</th>
                  <th>Abonnement</th>
                  <th>Erstellt</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => {
                  const status = getCompanyStatus(company);

                  return (
                    <tr key={company.id}>
                      <td>
                        <Link
                          className={styles.companyLink}
                          href={`/operator/companies/${company.id}`}
                        >
                          {company.name}
                        </Link>
                        <span className={styles.subtle}>{company.email}</span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles[status.tone]}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>{company.userCount}</td>
                      <td>{company.leadCount}</td>
                      <td>{formatDateTime(company.lastLeadAt)}</td>
                      <td>
                        <span>{company.failedNotifications7d} fehlgeschlagen</span>
                        <span className={styles.subtle}>
                          {company.dueNotifications} fällig · {company.staleProcessingNotifications} festhängend
                        </span>
                      </td>
                      <td>
                        <span>{formatSubscription(company)}</span>
                        {company.currentPeriodEnd ? (
                          <span className={styles.subtle}>
                            Bis {formatDateTime(company.currentPeriodEnd)}
                          </span>
                        ) : null}
                      </td>
                      <td>{formatDateTime(company.createdAt)}</td>
                      <td>
                        <div className={styles.actionGroup}>
                          <form action={company.deletedAt ? activateCompanyAction : deactivateCompanyAction}>
                            <input type="hidden" name="company_id" value={company.id} />
                            <button className={styles.secondaryButton} type="submit">
                              {company.deletedAt ? "Aktivieren" : "Deaktivieren"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
