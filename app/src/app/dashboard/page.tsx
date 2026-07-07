import { logoutAction } from "@/features/auth/actions";
import { getDashboardMetrics } from "@/features/dashboard/data";
import { getUserCompanyState } from "@/features/onboarding/company";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import styles from "./dashboard.module.css";

const DEV_FALLBACK_COMPANY_ID = "11111111-1111-1111-1111-111111111111";

const getCompanyId = async () => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return DEV_FALLBACK_COMPANY_ID;
  }

  const companyState = await getUserCompanyState(user.id);
  return companyState.companyId ?? DEV_FALLBACK_COMPANY_ID;
};

export default async function DashboardPage() {
  const companyId = await getCompanyId();
  const metrics = await getDashboardMetrics(companyId);
  const totalLeads =
    metrics.newLeads +
    metrics.contactedLeads +
    metrics.successfulLeads +
    metrics.unsuccessfulLeads;

  return (
    <main className={styles.shell}>
      <section className={styles.header} aria-labelledby="dashboard-title">
        <p className={styles.eyebrow}>Dashboard</p>
        <h1 className={styles.title} id="dashboard-title">
          Ihre Übersicht
        </h1>
        <p className={styles.copy}>
          Schneller Überblick über Ihre aktuellen Leads und den Weg zur Lead-Verwaltung.
        </p>

        <form action={logoutAction} className={styles.toolbar}>
          <button className={styles.button} type="submit">
            Abmelden
          </button>
        </form>
      </section>

      {totalLeads === 0 ? (
        <section className={styles.empty} aria-label="Keine Leads vorhanden">
          <h2>Keine Leads vorhanden</h2>
          <p>
            Sobald neue Anfragen eingehen, sehen Sie hier die wichtigsten Lead-Zahlen.
          </p>
          <a className={styles.button} href="/dashboard/leads">
            Leads verwalten
          </a>
          <a className={styles.button} href="/dashboard/settings" style={{ marginTop: 12 }}>
            Firmen­einstellungen
          </a>
        </section>
      ) : null}

      <section className={styles.grid} aria-label="Dashboard Übersicht">
        <article className={styles.card}>
          <p className={styles.cardLabel}>Neue Anfragen</p>
          <strong className={styles.cardValue}>{metrics.newLeads}</strong>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>Kontaktiert</p>
          <strong className={styles.cardValue}>{metrics.contactedLeads}</strong>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>Erfolgreich</p>
          <strong className={styles.cardValue}>{metrics.successfulLeads}</strong>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>Nicht erfolgreich</p>
          <strong className={styles.cardValue}>{metrics.unsuccessfulLeads}</strong>
        </article>
      </section>

      {totalLeads > 0 ? (
        <section className={styles.empty} aria-label="Leads verwalten">
          <h2>Lead-Übersicht</h2>
          <p>Gehen Sie zur Lead-Verwaltung, um Status und Ergebnisse zu aktualisieren.</p>
          <a className={styles.button} href="/dashboard/leads">
            Zu Leads
          </a>
        </section>
      ) : null}
    </main>
  );
}
