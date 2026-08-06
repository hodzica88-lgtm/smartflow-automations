import Link from "next/link";
import { BILLING_ROUTE, requireUserCompanyAccess } from "@/features/billing/service";
import { logoutAction } from "@/features/auth/actions";
import { getDashboardMetrics } from "@/features/dashboard/data";
import { DASHBOARD_COPY } from "@/shared/i18n/dashboard";
import { getRequestMarket } from "@/shared/i18n/request";
import {
  createSupabaseServiceRoleClient,
} from "@/shared/lib/supabase/server";
import InquiryShareSection from "./InquiryShareSection";

import styles from "./dashboard.module.css";

const OPEN_LEAD_STATUSES = ["new", "contacted"] as const;
const getStatusLabels = (market: "de" | "us") => {
  const copy = DASHBOARD_COPY[market];
  return {
    new: copy.newLeads,
    contacted: copy.contacted,
  } as Record<(typeof OPEN_LEAD_STATUSES)[number], string>;
};

type OpenLead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  inquiry_type: string | null;
  status: (typeof OPEN_LEAD_STATUSES)[number];
  created_at: string;
};

type RecentLeadEvaluation = {
  total: number;
  successful: number;
  unsuccessful: number;
  open: number;
  resultRate: number | null;
};

const getRecentFailedNotificationCount = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("notification_queue")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "failed")
    .gte("updated_at", since);

  if (error) {
    throw error;
  }

  return count ?? 0;
};

const getCompanyId = async () => {
  const access = await requireUserCompanyAccess({
    nextPath: "/dashboard",
  });

  return access.companyId;
};

const getOpenLeads = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, first_name, last_name, phone, inquiry_type, status, created_at")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .in("status", [...OPEN_LEAD_STATUSES])
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) {
    throw error;
  }

  return (data ?? []) as OpenLead[];
};

const getRecentLeadEvaluation = async (
  companyId: string,
): Promise<RecentLeadEvaluation> => {
  const supabase = createSupabaseServiceRoleClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("leads")
    .select("status")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .gte("created_at", since);

  if (error) {
    throw error;
  }

  const leads = data ?? [];
  const successful = leads.filter((lead) => lead.status === "successful").length;
  const unsuccessful = leads.filter((lead) => lead.status === "unsuccessful").length;
  const open = leads.filter(
    (lead) => lead.status === "new" || lead.status === "contacted",
  ).length;
  const completed = successful + unsuccessful;

  return {
    total: leads.length,
    successful,
    unsuccessful,
    open,
    resultRate: completed > 0 ? successful / completed : null,
  };
};

export default async function DashboardPage() {
  const { market, config } = await getRequestMarket();
  const copy = DASHBOARD_COPY[market];
  const statusLabels = getStatusLabels(market);
  const companyId = await getCompanyId();
  const [metrics, openLeads, recentLeadEvaluation, recentFailedNotificationCount] =
    await Promise.all([
      getDashboardMetrics(companyId),
      getOpenLeads(companyId),
      getRecentLeadEvaluation(companyId),
      getRecentFailedNotificationCount(companyId),
    ]);
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
          {copy.overviewTitle}
        </h1>
        <p className={styles.copy}>
          {copy.overviewCopy}
        </p>

        <form action={logoutAction} className={styles.toolbar}>
          <Link className={styles.button} href={BILLING_ROUTE}>
            Billing
          </Link>
          <button className={styles.button} type="submit">
            {copy.logout}
          </button>
        </form>
      </section>

      {totalLeads === 0 ? (
        <section className={styles.empty} aria-label="Keine Leads vorhanden">
          <h2>{copy.noLeadsTitle}</h2>
          <p>
            {copy.noLeadsCopy}
          </p>
          <div className={styles.sectionActions}>
            <Link className={styles.button} href="/dashboard/leads">{copy.manageLeads}</Link>
            <a className={styles.buttonSecondary} href="/dashboard/settings">
              {copy.companySettings}
            </a>
          </div>
        </section>
      ) : null}

      <section className={styles.grid} aria-label="Dashboard Übersicht">
        <article className={styles.card}>
          <p className={styles.cardLabel}>{copy.newLeads}</p>
          <strong className={styles.cardValue}>{metrics.newLeads}</strong>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>{copy.contacted}</p>
          <strong className={styles.cardValue}>{metrics.contactedLeads}</strong>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>{copy.successful}</p>
          <strong className={styles.cardValue}>{metrics.successfulLeads}</strong>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>{copy.unsuccessful}</p>
          <strong className={styles.cardValue}>{metrics.unsuccessfulLeads}</strong>
        </article>
      </section>

      {recentFailedNotificationCount > 0 ? (
        <section className={`${styles.empty} ${styles.warningSection}`} aria-label="E-Mail-Versand prüfen">
          <h2>{copy.checkEmailDelivery}</h2>
          <p>{copy.checkEmailDeliveryCopy}</p>
          <p>{copy.failedNotificationsLastDays(recentFailedNotificationCount)}</p>
          <p>{market === "us" ? "Please review the notification email in settings." : "Bitte pruefen Sie die Benachrichtigungs-E-Mail in den Einstellungen."}</p>
          <Link className={styles.sectionLink} href="/dashboard/settings">
            {copy.openSettings}
          </Link>
        </section>
      ) : null}

      <section className={styles.empty} aria-label="Auswertung der letzten 30 Tage">
        <div className={styles.sectionHeader}>
          <div>
            <h2>{copy.last30DaysTitle}</h2>
            <p>{copy.last30DaysCopy}</p>
          </div>
          <Link className={styles.sectionLink} href="/dashboard/analytics">
            {copy.openAnalytics}
          </Link>
        </div>
        <div className={styles.grid}>
          <article className={styles.card}>
            <p className={styles.cardLabel}>{copy.totalInquiries}</p>
            <strong className={styles.cardValue}>{recentLeadEvaluation.total}</strong>
          </article>

          <article className={styles.card}>
            <p className={styles.cardLabel}>{copy.successful}</p>
            <strong className={styles.cardValue}>{recentLeadEvaluation.successful}</strong>
          </article>

          <article className={styles.card}>
            <p className={styles.cardLabel}>{copy.unsuccessful}</p>
            <strong className={styles.cardValue}>{recentLeadEvaluation.unsuccessful}</strong>
          </article>

          <article className={styles.card}>
            <p className={styles.cardLabel}>{copy.stillOpen}</p>
            <strong className={styles.cardValue}>{recentLeadEvaluation.open}</strong>
          </article>
        </div>
        <p>
          {recentLeadEvaluation.resultRate === null
            ? copy.noClosedLeads
            : copy.successRate(Math.round(recentLeadEvaluation.resultRate * 100))}
        </p>
      </section>

      {totalLeads > 0 ? (
        <section className={styles.empty} aria-label="Leads verwalten">
          <h2>{copy.leadOverviewTitle}</h2>
          <p>{copy.leadOverviewCopy}</p>
          <div className={styles.sectionActions}>
            <Link className={styles.button} href="/dashboard/leads">{copy.toLeads}</Link>
          </div>
        </section>
      ) : null}

      <section className={styles.empty} aria-label="Offene Anfragen">
        <div className={styles.sectionHeader}>
          <div>
            <h2>{copy.openInquiriesTitle}</h2>
            <p>{copy.openInquiriesCopy}</p>
          </div>
          <Link className={styles.sectionLink} href="/dashboard/leads">
            {copy.showAllInquiries}
          </Link>
        </div>

        {openLeads.length === 0 ? (
          <p>{copy.noOpenInquiries}</p>
        ) : (
          <div className={styles.openLeadList}>
            {openLeads.map((lead) => {
              const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || copy.unknownContact;
              const isNewLead = lead.status === "new";

              return (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads/${lead.id}`}
                  className={`${styles.openLeadCard} ${isNewLead ? styles.openLeadCardNew : styles.openLeadCardContacted}`}
                >
                  <div className={styles.openLeadTopRow}>
                    <strong className={styles.openLeadName}>{leadName}</strong>
                    <span className={`${styles.openLeadStatus} ${isNewLead ? styles.openLeadStatusNew : styles.openLeadStatusContacted}`}>
                      {statusLabels[lead.status]}
                    </span>
                  </div>
                  <div className={styles.openLeadMeta}>
                    {lead.phone ? <span>{lead.phone}</span> : null}
                    <span>{lead.inquiry_type ?? copy.notProvided}</span>
                    <span>{new Date(lead.created_at).toLocaleString(config.locale, { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <InquiryShareSection companyId={companyId} />
    </main>
  );
}
