import Link from "next/link";

import { logoutAction } from "@/features/auth/actions";
import { activateCompanyAction, deactivateCompanyAction } from "@/features/operator/actions";
import { requireOperatorUser } from "@/features/operator/access";
import {
  getOperatorDashboardData,
  type OperatorCompany,
} from "@/features/operator/data";

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
          <p className={styles.eyebrow}>Varnito Betreiberbereich</p>
          <h1 className={styles.title} id="operator-title">
            Systemübersicht
          </h1>
          <p className={styles.copy}>
            Zentrale Übersicht über Kundenunternehmen, Leads, Abonnements und
            Benachrichtigungsprobleme.
          </p>
          <p className={styles.operatorIdentity}>Angemeldet als {operator.email ?? operator.id}</p>
        </div>

        <div className={styles.actions}>
          <Link className={styles.secondaryButton} href="/dashboard">
            Kundendashboard
          </Link>
          <form action={logoutAction}>
            <button className={styles.primaryButton} type="submit">
              Abmelden
            </button>
          </form>
        </div>
      </section>

      <section className={styles.companySection} aria-label="Suche">
        <form method="get" className={styles.sectionHeader}>
          <div>
            <h2>Suche</h2>
            <p>Nach Firma, E-Mail oder Abo-Status suchen.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              name="q"
              defaultValue={resolvedSearchParams?.q ?? ""}
              placeholder="Firma suchen"
              style={{ minHeight: 42, borderRadius: 8, border: "1px solid #cbd5e0", padding: "0 12px" }}
            />
            <button className={styles.primaryButton} type="submit">
              Suchen
            </button>
          </div>
        </form>
      </section>

      <section className={styles.metrics} aria-label="Betreiberkennzahlen">
        <article className={styles.metricCard}>
          <p>Aktive Unternehmen</p>
          <strong>{metrics.activeCompanies}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Benutzer insgesamt</p>
          <strong>{metrics.totalUsers}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Leads letzte 30 Tage</p>
          <strong>{metrics.leadsLast30d}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Fehler letzte 24 Stunden</p>
          <strong>{metrics.failedNotifications24h}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Fällige Queue-Einträge</p>
          <strong>{metrics.dueNotifications}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Unternehmen mit Warnung</p>
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
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
