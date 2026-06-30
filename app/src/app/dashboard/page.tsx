import { redirect } from "next/navigation";

import { logoutAction } from "@/features/auth/actions";
import { getDashboardMetrics } from "@/features/dashboard/data";
import { getUserCompanyState } from "@/features/onboarding/company";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyState = await getUserCompanyState(user.id);

  if (!companyState.companyId) {
    redirect("/onboarding");
  }

  const metrics = await getDashboardMetrics(companyState.companyId);
  const lastLeadName = metrics.lastLead
    ? [
        metrics.lastLead.first_name,
        metrics.lastLead.last_name,
        metrics.lastLead.company_name,
      ]
        .filter(Boolean)
        .join(" ") || "Unnamed lead"
    : "No leads yet";
  const lastLeadDetail = metrics.lastLead
    ? metrics.lastLead.email ?? metrics.lastLead.phone ?? metrics.lastLead.status
    : "New leads will appear here when they arrive.";

  return (
    <main className={styles.shell}>
      <section className={styles.header} aria-labelledby="dashboard-title">
        <p className={styles.eyebrow}>Dashboard</p>
        <h1 className={styles.title} id="dashboard-title">
          SmartFlow dashboard
        </h1>
        <p className={styles.copy}>
          A simple snapshot of your company leads and reminders.
        </p>

        <form action={logoutAction} className={styles.toolbar}>
          <button className={styles.button} type="submit">
            Log out
          </button>
        </form>
      </section>

      <section className={styles.grid} aria-label="Dashboard metrics">
        <article className={styles.card}>
          <p className={styles.cardLabel}>Leads received</p>
          <strong className={styles.cardValue}>{metrics.leadsReceived}</strong>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>Leads contacted</p>
          <strong className={styles.cardValue}>{metrics.leadsContacted}</strong>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>Reminders</p>
          <strong className={styles.cardValue}>{metrics.reminders}</strong>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>Open leads</p>
          <strong className={styles.cardValue}>{metrics.openLeads}</strong>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>Last lead</p>
          <strong className={styles.lastLead}>{lastLeadName}</strong>
          <span className={styles.cardMeta}>{lastLeadDetail}</span>
        </article>
      </section>

      {metrics.leadsReceived === 0 ? (
        <section className={styles.empty} aria-label="Empty leads state">
          <h2>No leads yet</h2>
          <p>
            Once SmartFlow receives a lead for your company, this dashboard will
            show the first activity here.
          </p>
        </section>
      ) : null}
    </main>
  );
}
