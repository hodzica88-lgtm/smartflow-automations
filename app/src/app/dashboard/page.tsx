import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/features/auth/actions";
import { getDashboardMetrics } from "@/features/dashboard/data";
import { getUserCompanyState } from "@/features/onboarding/company";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/shared/lib/supabase/server";
import InquiryShareSection from "./InquiryShareSection";

import styles from "./dashboard.module.css";

const OPEN_LEAD_STATUSES = ["new", "contacted"] as const;
const STATUS_LABELS: Record<(typeof OPEN_LEAD_STATUSES)[number], string> = {
  new: "Neue Anfrage",
  contacted: "Kontaktiert",
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

const getCompanyId = async () => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyState = await getUserCompanyState(user.id);
  if (!companyState.companyId) {
    redirect("/onboarding");
  }

  return companyState.companyId;
};

const getOpenLeads = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, first_name, last_name, phone, inquiry_type, status, created_at")
    .eq("company_id", companyId)
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

const formatCreatedAt = (createdAt: string) => {
  try {
    return new Date(createdAt).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return createdAt;
  }
};

export default async function DashboardPage() {
  const companyId = await getCompanyId();
  const metrics = await getDashboardMetrics(companyId);
  const openLeads = await getOpenLeads(companyId);
  const recentLeadEvaluation = await getRecentLeadEvaluation(companyId);
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
          <Link className={styles.button} href="/dashboard/leads">Leads verwalten</Link>
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

      <section className={styles.empty} aria-label="Auswertung der letzten 30 Tage">
        <h2>Auswertung der letzten 30 Tage</h2>
        <div className={styles.grid}>
          <article className={styles.card}>
            <p className={styles.cardLabel}>Anfragen insgesamt</p>
            <strong className={styles.cardValue}>{recentLeadEvaluation.total}</strong>
          </article>

          <article className={styles.card}>
            <p className={styles.cardLabel}>Erfolgreich</p>
            <strong className={styles.cardValue}>{recentLeadEvaluation.successful}</strong>
          </article>

          <article className={styles.card}>
            <p className={styles.cardLabel}>Nicht erfolgreich</p>
            <strong className={styles.cardValue}>{recentLeadEvaluation.unsuccessful}</strong>
          </article>

          <article className={styles.card}>
            <p className={styles.cardLabel}>Noch offen</p>
            <strong className={styles.cardValue}>{recentLeadEvaluation.open}</strong>
          </article>
        </div>
        <p>
          {recentLeadEvaluation.resultRate === null
            ? "Noch keine abgeschlossenen Anfragen"
            : `Erfolgsquote: ${Math.round(recentLeadEvaluation.resultRate * 100)} %`}
        </p>
      </section>

      {totalLeads > 0 ? (
        <section className={styles.empty} aria-label="Leads verwalten">
          <h2>Lead-Übersicht</h2>
          <p>Gehen Sie zur Lead-Verwaltung, um Status und Ergebnisse zu aktualisieren.</p>
          <Link className={styles.button} href="/dashboard/leads">Zu Leads</Link>
        </section>
      ) : null}

      <section className={styles.empty} aria-label="Offene Anfragen">
        <div className={styles.sectionHeader}>
          <div>
            <h2>Offene Anfragen</h2>
            <p>Hier sehen Sie die ältesten offenen Anfragen zuerst.</p>
          </div>
          <Link className={styles.sectionLink} href="/dashboard/leads">
            Alle Anfragen anzeigen
          </Link>
        </div>

        {openLeads.length === 0 ? (
          <p>Aktuell sind keine offenen Anfragen vorhanden.</p>
        ) : (
          <div className={styles.openLeadList}>
            {openLeads.map((lead) => {
              const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unbekannter Kontakt";
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
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </div>
                  <div className={styles.openLeadMeta}>
                    {lead.phone ? <span>{lead.phone}</span> : null}
                    <span>{lead.inquiry_type ?? "Nicht angegeben"}</span>
                    <span>{formatCreatedAt(lead.created_at)}</span>
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



