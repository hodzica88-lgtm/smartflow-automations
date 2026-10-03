import Link from "next/link";

import { BILLING_ROUTE } from "@/features/billing/service";
import { logoutAction } from "@/features/auth/actions";
import { getDashboardMetrics } from "@/features/dashboard/data";
import { DASHBOARD_COPY } from "@/shared/i18n/dashboard";
import { getRequestMarket } from "@/shared/i18n/request";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
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

const getInitials = (value: string) => {
  const cleaned = value
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const getCompanyDisplayName = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data?.name) {
    return null;
  }

  const name = String(data.name).trim();
  return name || null;
};

const getCustomerProfileSummary = async (companyId: string) => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    return null;
  }

  const rawMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstName = typeof rawMetadata.first_name === "string" ? rawMetadata.first_name.trim() : "";
  const lastName = typeof rawMetadata.last_name === "string" ? rawMetadata.last_name.trim() : "";
  const fullName = typeof rawMetadata.full_name === "string" ? rawMetadata.full_name.trim() : "";
  const email = typeof user.email === "string" ? user.email.trim() : "";
  const companyName = await getCompanyDisplayName(companyId);
  const primaryText = [fullName, [firstName, lastName].filter(Boolean).join(" "), email]
    .find((value) => typeof value === "string" && value.trim().length > 0)
    ?.trim();

  if (!primaryText && !companyName) {
    return null;
  }

  return {
    initials: getInitials(primaryText ?? companyName ?? "") || "A",
    primaryText: primaryText ?? companyName ?? "",
    secondaryText: companyName && companyName !== primaryText ? companyName : null,
  };
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

type ActivityPoint = {
  key: string;
  label: string;
  newCount: number;
  contactedCount: number;
  openCount: number;
};

type SourceBreakdown = {
  name: string;
  count: number;
};

type CustomerDashboardViewProps = {
  companyId: string;
  showBillingAction?: boolean;
  billingHref?: string;
  isOwner?: boolean;
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

const getLast7DaysActivity = async (companyId: string): Promise<ActivityPoint[]> => {
  const supabase = createSupabaseServiceRoleClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const { data, error } = await supabase
    .from("leads")
    .select("status, created_at")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .gte("created_at", start.toISOString());

  if (error) {
    throw error;
  }

  const timeline = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    const key = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString("de-DE", { day: "numeric" });

    return {
      key,
      label,
      newCount: 0,
      contactedCount: 0,
      openCount: 0,
    } satisfies ActivityPoint;
  });

  for (const lead of data ?? []) {
    const createdAt = lead.created_at ? new Date(lead.created_at) : null;
    if (!createdAt) {
      continue;
    }

    const key = createdAt.toISOString().slice(0, 10);
    const point = timeline.find((entry) => entry.key === key);
    if (!point) {
      continue;
    }

    if (lead.status === "new") {
      point.newCount += 1;
      point.openCount += 1;
    }

    if (lead.status === "contacted") {
      point.contactedCount += 1;
      point.openCount += 1;
    }
  }

  return timeline;
};

const getLeadSourceSummary = async (companyId: string): Promise<SourceBreakdown[]> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("leads")
    .select("source")
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  const counts = new Map<string, number>();
  for (const lead of data ?? []) {
    const source = typeof lead.source === "string" ? lead.source.trim() : "";
    if (!source) {
      continue;
    }

    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }));
};

const formatSourceName = (source: string) =>
  source
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export default async function CustomerDashboardView({
  companyId,
  showBillingAction = true,
  billingHref = BILLING_ROUTE,
  isOwner = false,
}: CustomerDashboardViewProps) {
  const { market } = await getRequestMarket();
  const copy = DASHBOARD_COPY[market];
  const statusLabels = getStatusLabels(market);
  const [metrics, openLeads, recentLeadEvaluation, recentFailedNotificationCount, activity, sourceSummary, profileSummary] =
    await Promise.all([
      getDashboardMetrics(companyId),
      getOpenLeads(companyId),
      getRecentLeadEvaluation(companyId),
      getRecentFailedNotificationCount(companyId),
      getLast7DaysActivity(companyId),
      getLeadSourceSummary(companyId),
      getCustomerProfileSummary(companyId),
    ]);

  const totalLeads =
    metrics.newLeads +
    metrics.contactedLeads +
    metrics.successfulLeads +
    metrics.unsuccessfulLeads;

  const maxActivityValue = Math.max(
    ...activity.map((day) => Math.max(day.newCount, day.contactedCount, day.openCount)),
    1,
  );
  const sourceMaxValue = Math.max(...sourceSummary.map((source) => source.count), 1);
  const dateFormatter = market === "us" ? "en-US" : "de-DE";

  const kpiCards = [
    {
      key: "new",
      label: copy.newLeads,
      value: metrics.newLeads,
      tone: styles.kpiNew,
      icon: (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 2.5v15M2.5 10h15" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"/>
        </svg>
      ),
    },
    {
      key: "contacted",
      label: copy.contacted,
      value: metrics.contactedLeads,
      tone: styles.kpiContacted,
      icon: (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5 12.5V5.5h10v9H9.5L5 15V12.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5"/>
          <path d="M7.5 9.5h5M7.5 7h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      key: "successful",
      label: copy.successful,
      value: metrics.successfulLeads,
      tone: styles.kpiSuccessful,
      icon: (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 10.5 3 3 7-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
        </svg>
      ),
    },
    {
      key: "unsuccessful",
      label: copy.unsuccessful,
      value: metrics.unsuccessfulLeads,
      tone: styles.kpiUnsuccessful,
      icon: (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"/>
        </svg>
      ),
    },
  ];

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.headerMain}>
          <p className={styles.eyebrow}>{market === "us" ? "Overview" : "Übersicht"}</p>
          <h1 className={styles.title} id="dashboard-title">
            {copy.overviewTitle}
          </h1>
          <p className={styles.subtitle}>{market === "us" ? "Here is the current overview of your inquiries." : "Hier ist der aktuelle Überblick über Ihre Anfragen."}</p>
        </div>

        <div className={styles.topbarMeta}>
          {profileSummary ? (
            <div className={styles.profileCard}>
              <span className={styles.profileAvatar}>{profileSummary.initials}</span>
              <div className={styles.profileMeta}>
                <span className={styles.profileTitle}>{profileSummary.primaryText}</span>
                {profileSummary.secondaryText ? (
                  <span className={styles.profileSubtitle}>{profileSummary.secondaryText}</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {showBillingAction ? (
            <Link className={styles.buttonSecondary} href={billingHref}>
              {market === "us" ? "Billing" : "Abrechnung"}
            </Link>
          ) : null}

          <form action={logoutAction} className={styles.logoutForm}>
            <button className={styles.button} type="submit">
              {copy.logout}
            </button>
          </form>
        </div>
      </header>

      <section className={styles.kpiGrid} aria-label="Dashboard Übersicht">
        {kpiCards.map((card) => (
          <article key={card.key} className={styles.kpiCard}>
            <div className={styles.cardHeader}>
              <span className={`${styles.kpiBadge} ${card.tone}`}>{card.icon}</span>
              <div className={styles.cardText}>
                <p className={styles.cardLabel}>{card.label}</p>
                <strong className={styles.cardValue}>{card.value}</strong>
              </div>
            </div>
            <p className={styles.cardMeta}>{market === "us" ? "Current snapshot" : "Aktueller Stand"}</p>
          </article>
        ))}
      </section>

      <section className={styles.insightRow}>
        <article className={styles.primaryPanel} aria-label={copy.openInquiriesTitle}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>{market === "us" ? "Pipeline" : "Pipeline"}</p>
              <h2>{copy.openInquiriesTitle}</h2>
            </div>
            <Link className={styles.sectionLink} href="/dashboard/leads">
              {copy.showAllInquiries}
            </Link>
          </div>

          <div className={styles.activityChart}>
            {activity.map((day) => (
              <div key={day.key} className={styles.activityDay}>
                <div className={styles.activityStack}>
                  <span
                    className={`${styles.seriesBar} ${styles.seriesOpen}`}
                    style={{ height: `${Math.max((day.openCount / maxActivityValue) * 100, day.openCount > 0 ? 14 : 0)}%` }}
                  />
                  <span
                    className={`${styles.seriesBar} ${styles.seriesContacted}`}
                    style={{ height: `${Math.max((day.contactedCount / maxActivityValue) * 100, day.contactedCount > 0 ? 14 : 0)}%` }}
                  />
                  <span
                    className={`${styles.seriesBar} ${styles.seriesNew}`}
                    style={{ height: `${Math.max((day.newCount / maxActivityValue) * 100, day.newCount > 0 ? 14 : 0)}%` }}
                  />
                </div>
                <span className={styles.dayLabel}>{day.label}</span>
              </div>
            ))}
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.legendOpen}`} /> {market === "us" ? "Open" : "Offen"}</span>
            <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.legendContacted}`} /> {copy.contacted}</span>
            <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.legendNew}`} /> {copy.newLeads}</span>
          </div>
        </article>

        <aside className={styles.summaryCard} aria-label={copy.last30DaysTitle}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>{market === "us" ? "Source mix" : "Quellenmix"}</p>
              <h2>{market === "us" ? "Source mix" : "Quellenmix"}</h2>
            </div>
            <Link className={styles.sectionLink} href="/dashboard/analytics">
              {copy.openAnalytics}
            </Link>
          </div>

          {sourceSummary.length > 0 ? (
            <div className={styles.sourceList}>
              {sourceSummary.map((source) => (
                <div key={source.name} className={styles.sourceRow}>
                  <div className={styles.sourceMeta}>
                    <span>{formatSourceName(source.name)}</span>
                    <strong>{source.count}</strong>
                  </div>
                  <div className={styles.sourceTrack}>
                    <span className={styles.sourceFill} style={{ width: `${(source.count / sourceMaxValue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className={styles.summaryMiniGrid}>
                <article className={styles.summaryMetric}>
                  <span className={styles.summaryMetricLabel}>{copy.totalInquiries}</span>
                  <span className={styles.summaryMetricValue}>{recentLeadEvaluation.total}</span>
                </article>
                <article className={styles.summaryMetric}>
                  <span className={styles.summaryMetricLabel}>{copy.successful}</span>
                  <span className={styles.summaryMetricValue}>{recentLeadEvaluation.successful}</span>
                </article>
                <article className={styles.summaryMetric}>
                  <span className={styles.summaryMetricLabel}>{copy.unsuccessful}</span>
                  <span className={styles.summaryMetricValue}>{recentLeadEvaluation.unsuccessful}</span>
                </article>
                <article className={styles.summaryMetric}>
                  <span className={styles.summaryMetricLabel}>{copy.stillOpen}</span>
                  <span className={styles.summaryMetricValue}>{recentLeadEvaluation.open}</span>
                </article>
              </div>

              <div className={styles.summaryNote}>
                {recentLeadEvaluation.resultRate === null
                  ? copy.noClosedLeads
                  : copy.successRate(Math.round(recentLeadEvaluation.resultRate * 100))}
              </div>
            </>
          )}
        </aside>
      </section>

      <section className={styles.contentRow}>
        <article className={styles.tablePanel} aria-label={copy.openInquiriesTitle}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>{market === "us" ? "Latest requests" : "Neueste Anfragen"}</p>
              <h2>{copy.openInquiriesTitle}</h2>
            </div>
            <Link className={styles.sectionLink} href="/dashboard/leads">
              {copy.showAllInquiries}
            </Link>
          </div>

          {openLeads.length === 0 ? (
            <p className={styles.emptyState}>{copy.noOpenInquiries}</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.inquiryTable}>
                <thead>
                  <tr>
                    <th>{market === "us" ? "Name" : "Name"}</th>
                    <th>{market === "us" ? "Inquiry" : "Anfrage"}</th>
                    <th>{market === "us" ? "Status" : "Status"}</th>
                    <th>{market === "us" ? "Received" : "Eingegangen"}</th>
                  </tr>
                </thead>
                <tbody>
                  {openLeads.map((lead) => {
                    const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || copy.unknownContact;
                    const isNewLead = lead.status === "new";

                    return (
                      <tr key={lead.id}>
                        <td className={styles.inquiryName}>{leadName}</td>
                        <td>{lead.inquiry_type ?? copy.notProvided}</td>
                        <td>
                          <span className={`${styles.statusPill} ${isNewLead ? styles.statusPillNew : styles.statusPillContacted}`}>
                            {statusLabels[lead.status]}
                          </span>
                        </td>
                        <td>{new Date(lead.created_at).toLocaleDateString(dateFormatter, { day: "2-digit", month: "2-digit" })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <aside className={styles.quickActions} aria-label={market === "us" ? "Quick actions" : "Schnellaktionen"}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>{market === "us" ? "Actions" : "Aktionen"}</p>
              <h2>{market === "us" ? "Quick actions" : "Schnellaktionen"}</h2>
            </div>
          </div>

          <div className={styles.quickActionList}>
            <Link className={styles.quickActionLink} href="/dashboard/leads">
              <span className={styles.quickActionIcon}>↗</span>
              <span className={styles.quickActionText}>
                <span className={styles.quickActionTitle}>{copy.openInquiriesTitle}</span>
                <span className={styles.quickActionDescription}>{copy.openInquiriesCopy}</span>
              </span>
              <span className={styles.quickActionChevron}>›</span>
            </Link>
            {isOwner ? (
              <Link className={styles.quickActionLink} href="/dashboard/team">
                <span className={styles.quickActionIcon} style={{ background: "rgba(16, 185, 129, 0.12)", color: "#0f766e" }}>👥</span>
                <span className={styles.quickActionText}>
                  <span className={styles.quickActionTitle}>{market === "us" ? "Invite team member" : "Teammitglied einladen"}</span>
                  <span className={styles.quickActionDescription}>{market === "us" ? "Manage invites and team access" : "Einladungen und Zugänge verwalten"}</span>
                </span>
                <span className={styles.quickActionChevron}>›</span>
              </Link>
            ) : null}
            <Link className={styles.quickActionLink} href="/dashboard/settings">
              <span className={styles.quickActionIcon}>⚙</span>
              <span className={styles.quickActionText}>
                <span className={styles.quickActionTitle}>{copy.navSettings}</span>
                <span className={styles.quickActionDescription}>{market === "us" ? "Company setup and automation" : "Unternehmen und Automationen"}</span>
              </span>
              <span className={styles.quickActionChevron}>›</span>
            </Link>
            <Link className={styles.quickActionLink} href="/dashboard/help">
              <span className={styles.quickActionIcon}>?</span>
              <span className={styles.quickActionText}>
                <span className={styles.quickActionTitle}>{copy.navHelp}</span>
                <span className={styles.quickActionDescription}>{market === "us" ? "Find answers and support" : "Antworten und Hilfe"}</span>
              </span>
              <span className={styles.quickActionChevron}>›</span>
            </Link>
            <Link className={styles.quickActionLink} href="#anfrageformular-teilen">
              <span className={styles.quickActionIcon}>⤴</span>
              <span className={styles.quickActionText}>
                <span className={styles.quickActionTitle}>{market === "us" ? "Share inquiry form" : "Anfrageformular teilen"}</span>
                <span className={styles.quickActionDescription}>{market === "us" ? "Link, embed, or QR code" : "Link, Embed oder QR-Code"}</span>
              </span>
              <span className={styles.quickActionChevron}>›</span>
            </Link>
          </div>
        </aside>
      </section>

      {recentFailedNotificationCount > 0 ? (
        <section className={styles.warningBanner} aria-label={copy.checkEmailDelivery}>
          <div className={styles.warningText}>
            <strong>{copy.checkEmailDelivery}</strong>
            <span>{copy.failedNotificationsLastDays(recentFailedNotificationCount)}</span>
          </div>
          <Link className={styles.warningLink} href="/dashboard/settings">
            {copy.openSettings}
          </Link>
        </section>
      ) : null}

      {totalLeads === 0 ? (
        <section className={styles.emptyStateCard} aria-label={copy.noLeadsTitle}>
          <h2>{copy.noLeadsTitle}</h2>
          <p>{copy.noLeadsCopy}</p>
          <div className={styles.sectionActions}>
            <Link className={styles.button} href="/dashboard/leads">{copy.manageLeads}</Link>
            <Link className={styles.buttonSecondary} href="/dashboard/settings">{copy.companySettings}</Link>
          </div>
        </section>
      ) : null}

      <InquiryShareSection companyId={companyId} />
    </main>
  );
}
