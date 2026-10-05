import Link from "next/link";

import {
  GROWTH_SOURCES,
  getGrowthMonthOptions,
  getGrowthMonthRange,
  getMonthKeyInBerlin,
} from "@/features/analytics/growth";
import { logoutAction } from "@/features/auth/actions";
import { requireOperatorUser } from "@/features/operator/access";
import OwnerInstallPrompt from "@/features/operator/OwnerInstallPrompt";
import { listOwnerBusinessNotifications } from "@/features/notifications/service";
import { getOwnerControlCenterData, getOwnerGrowthMonthData } from "@/features/operator/data";
import { getOwnerPartnerMeteringOverview } from "@/features/partners/operator-data";
import { PartnerMeteringPanel } from "@/features/partners/PartnerMeteringPanel";
import { getInboxPreview, getSupportInboxCounts } from "@/features/support/service";
import { loadServerEnv } from "@/shared/config/env";
import { getRequestMarket } from "@/shared/i18n/request";
import VarnitoLogo from "@/shared/ui/VarnitoLogo";

import styles from "./owner.module.css";

export const dynamic = "force-dynamic";

const formatCurrency = (value: number, currency: "EUR" | "USD") =>
  new Intl.NumberFormat(currency === "EUR" ? "de-DE" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

const formatTimestamp = (value: string | null, locale: "de-DE" | "en-US") => {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

const EMPTY_SOURCE_METRICS = {
  visitors: 0,
  botVisitors: 0,
  unknownVisitors: 0,
  demos: 0,
  trials: 0,
  paid: 0,
  trialCancellations: 0,
  subscriptionCancellations: 0,
};

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12.5V5.5h7v7H4Zm9 0V4h7v8.5h-7ZM4 18.5v-5h7v5H4Zm9 0v-3h7v3h-7Z" fill="currentColor" />
  </svg>
);

const PreviewIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Zm2 2.5h12v9H6V8Zm1.5 1.5v6h9v-6h-9Zm2.5 1.5h4v1.5h-4v-1.5Z" fill="currentColor" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.5a5.5 5.5 0 0 1 5.5 5.5v2.17c0 1.83.74 3.59 2.08 4.86l.75.74h-16.66l.75-.74A6.82 6.82 0 0 0 6.5 11.17V9A5.5 5.5 0 0 1 12 3.5Zm0 17a2.75 2.75 0 0 1-2.63-1.88h5.26A2.75 2.75 0 0 1 12 20.5Z" fill="currentColor" />
  </svg>
);

const SupportIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.5 6.5A2.5 2.5 0 0 1 6 4h12a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 18 17H9l-5.5 3v-13.5Zm2.5 1.5h12v1.2H6V8Zm0 3.3h8.2v1.2H6v-1.2Zm0 3.2h12v1.2H6v-1.2Z" fill="currentColor" />
  </svg>
);

const getInitials = (value: string) => {
  const cleaned = value.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (!cleaned) {
    return "O";
  }

  const initials = cleaned.split(/\s+/).filter(Boolean).slice(0, 2);
  return initials.map((part) => part.charAt(0).toUpperCase()).join("") || "O";
};

export default async function OwnerControlCenterPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await getRequestMarket();
  const locale = market === "us" ? "en-US" : "de-DE";
  const operator = await requireOperatorUser({ nextPath: "/operator/owner" });
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedMonth = typeof resolvedSearchParams?.month === "string" && /^\d{4}-\d{2}$/.test(resolvedSearchParams.month)
    ? resolvedSearchParams.month
    : getMonthKeyInBerlin(new Date());
  const monthRange = getGrowthMonthRange(selectedMonth);
  const monthOptions = getGrowthMonthOptions();
  const growthReport = await getOwnerGrowthMonthData(selectedMonth);
  const data = await getOwnerControlCenterData();
  const partnerMeteringEnabled = loadServerEnv().partnerMeteringEnabled;
  const partnerMeteringData = partnerMeteringEnabled
    ? await getOwnerPartnerMeteringOverview()
    : {
        enabled: false,
        partners: [],
        summary: {
          activePartners: 0,
          activeCustomers: 0,
          newThisMonth: 0,
          deactivatedThisMonth: 0,
          netChangeThisMonth: 0,
          billableCustomers: 0,
          mrrByCurrency: {},
        },
      };
  const recentNotifications = await listOwnerBusinessNotifications(3);
  const [mailCounts, inboxPreview] = await Promise.all([
    getSupportInboxCounts(),
    getInboxPreview(3),
  ]);

  const warnings = data.warnings.length > 0 ? data.warnings : [market === "us" ? "No current warnings." : "Aktuell keine Warnungen."];
  const sourceLabels: Record<(typeof GROWTH_SOURCES)[number], string> = {
    producthunt: "ProductHunt",
    g2: "G2",
    saasworthy: "SaaSworthy",
    sourceforge: "SourceForge",
    slashdot: "Slashdot",
    google: "Google",
    capterra: "Capterra",
    getapp: "GetApp",
    softwareadvice: "Software Advice",
    bing: "Bing",
    duckduckgo: "DuckDuckGo",
    yahoo: "Yahoo",
    linkedin: "LinkedIn",
    reddit: "Reddit",
    x: "X / Twitter",
    facebook: "Facebook",
    instagram: "Instagram",
    direct: "Direct",
    other: "Other",
  };

  const growthSummary = growthReport.summary ?? {
    visitors: 0,
    botVisitors: 0,
    unknownVisitors: 0,
    totalVisits: 0,
    markets: { de: 0, us: 0, unknown: 0 },
    humanMarkets: { de: 0, us: 0, unknown: 0 },
    otherBreakdown: {},
    demoOpened: 0,
    trialsStarted: 0,
    payingCustomers: 0,
    trialCancellations: 0,
    subscriptionCancellations: 0,
    sources: Object.fromEntries(GROWTH_SOURCES.map((source) => [source, { ...EMPTY_SOURCE_METRICS }])) as Record<(typeof GROWTH_SOURCES)[number], typeof EMPTY_SOURCE_METRICS>,
  };
  const humanMarketBreakdown = growthSummary.humanMarkets ?? { de: 0, us: 0, unknown: 0 };
  const recentHumanVisits = data.recentHumanVisits ?? [];

  const sourceRows = GROWTH_SOURCES.map((source) => {
    const entry = growthSummary.sources?.[source] ?? EMPTY_SOURCE_METRICS;
    const total = entry.visitors + entry.botVisitors + entry.unknownVisitors + entry.demos + entry.trials + entry.paid;
    return {
      key: source,
      label: sourceLabels[source],
      visits: entry.visitors,
      total,
    };
  }).filter(({ visits, total }) => visits > 0 || total > 0).sort((a, b) => b.visits - a.visits).slice(0, 8);

  const trafficCards = [
    {
      label: "DE-Seite",
      value: humanMarketBreakdown.de,
      tone: "neutral",
      hint: "Menschliche Seitenaufrufe nach Varnito-Version",
    },
    {
      label: "US-Seite",
      value: humanMarketBreakdown.us,
      tone: "neutral",
      hint: "Menschliche Seitenaufrufe nach Varnito-Version",
    },
    {
      label: "Unklassifiziert",
      value: growthSummary.unknownVisitors,
      tone: "neutral",
      hint: "Zugriff konnte nicht sicher als Browser oder Bot erkannt werden.",
    },
    {
      label: "Bot-Besuche",
      value: growthSummary.botVisitors,
      tone: "warning",
      hint: "Automatisierte Crawler und bekannte Bots.",
    },
  ];

  const healthCards = [
    {
      title: market === "us" ? "Server status" : "Serverstatus",
      value: data.serverStatus === "ok" ? (market === "us" ? "Operational" : "Betriebsbereit") : (market === "us" ? "Degraded" : "Beeinträchtigt"),
      state: data.serverStatus === "ok" ? "good" : "warn",
      detail: `${market === "us" ? "Queue delay" : "Queue-Verzögerung"}: ${data.queue.stale}`,
    },
    {
      title: market === "us" ? "Health status" : "Health-Status",
      value: data.healthStatus === "ok" ? "OK" : (market === "us" ? "Degraded" : "Beeinträchtigt"),
      state: data.healthStatus === "ok" ? "good" : "warn",
      detail: `${market === "us" ? "Failed 24h" : "Fehlgeschlagen 24h"}: ${data.queue.failed24h}`,
    },
    {
      title: market === "us" ? "Queue status" : "Queue-Status",
      value: `${data.queue.due}`,
      state: data.queue.due > 0 ? "warn" : "good",
      detail: `${market === "us" ? "Due" : "Ausstehend"}: ${data.queue.due}`,
    },
    {
      title: market === "us" ? "Backup" : "Sicherung",
      value: data.lastBackup.status,
      state: data.lastBackup.status === "Aktuell" ? "good" : data.lastBackup.status === "Überfällig" ? "warn" : "neutral",
      detail: data.lastBackup.checkedAt ? formatTimestamp(data.lastBackup.checkedAt, locale) : (market === "us" ? "No backup check yet" : "Noch kein Sicherungscheck"),
    },
  ];

  const operatorDisplayName = typeof operator.email === "string" && operator.email.trim().length > 0
    ? operator.email.trim()
    : typeof operator.id === "string" && operator.id.trim().length > 0
      ? operator.id.trim()
      : "Owner";

  const sourceMax = Math.max(1, ...sourceRows.map((source) => source.visits || 0));
  const monthLabel = new Date(`${monthRange.monthKey}-01T12:00:00`).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  return (
    <main className={styles.ownerAppShell}>
      <aside className={styles.ownerSidebar} aria-label={market === "us" ? "Owner navigation" : "Owner-Navigation"}>
        <div className={styles.ownerSidebarInner}>
          <VarnitoLogo href="/operator/owner" subtitle={market === "us" ? "Operator" : "Operator"} />

          <nav className={styles.ownerNav}>
            <Link href="/operator/owner" className={`${styles.ownerNavItem} ${styles.ownerNavItemActive}`}>
              <span className={styles.ownerNavLabel}>
                <span className={styles.ownerNavIcon}><DashboardIcon /></span>
                <span>{market === "us" ? "Dashboard" : "Dashboard"}</span>
              </span>
            </Link>
            <Link href="/operator/customer-preview" className={styles.ownerNavItem}>
              <span className={styles.ownerNavLabel}>
                <span className={styles.ownerNavIcon}><PreviewIcon /></span>
                <span>{market === "us" ? "Customer preview" : "Kundendashboard"}</span>
              </span>
            </Link>
            <Link href="/operator/notifications" className={styles.ownerNavItem}>
              <span className={styles.ownerNavLabel}>
                <span className={styles.ownerNavIcon}><BellIcon /></span>
                <span>{market === "us" ? "Notifications" : "Benachrichtigungen"}</span>
              </span>
            </Link>
            <Link href="/operator/support" className={styles.ownerNavItem}>
              <span className={styles.ownerNavLabel}>
                <span className={styles.ownerNavIcon}><SupportIcon /></span>
                <span>{market === "us" ? "Support / Mail" : "Support / Mail"}</span>
              </span>
            </Link>
          </nav>

          <div className={styles.ownerSidebarFooter}>
            <div className={styles.ownerSidebarMeta}>
              <span className={styles.ownerSidebarLabel}>{market === "us" ? "Operator" : "Operator"}</span>
              <strong>{operatorDisplayName}</strong>
            </div>
            <form action={logoutAction} className={styles.ownerLogoutForm}>
              <button type="submit" className={styles.ownerLogoutButton}>
                {market === "us" ? "Log out" : "Abmelden"}
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className={styles.ownerWorkspace}>
        <div className={styles.ownerPage}>
          <header className={styles.ownerHeader}>
            <div className={styles.ownerHeaderRow}>
              <div className={styles.ownerHeaderCopy}>
                <p className={styles.ownerEyebrow}>{market === "us" ? "Varnito" : "Varnito"}</p>
                <h1 className={styles.ownerTitle}>{market === "us" ? "Owner Dashboard" : "Owner Dashboard"}</h1>
                <p className={styles.ownerSubtitle}>
                  {market === "us"
                    ? "One compact view of revenue, growth, business health, and operational status."
                    : "Eine kompakte Übersicht zu Umsatz, Wachstum, Geschäftslage und Betriebsstatus."}
                </p>
              </div>

              <div className={styles.ownerHeaderMeta}>
                <div className={styles.ownerProfileCard}>
                  <span className={styles.ownerProfileAvatar}>{getInitials(operatorDisplayName)}</span>
                  <div className={styles.ownerProfileMeta}>
                    <span className={styles.ownerProfileName}>{operatorDisplayName}</span>
                    <span className={styles.ownerProfileRole}>{market === "us" ? "Operator" : "Operator"}</span>
                  </div>
                </div>
                <form action={logoutAction} className={styles.ownerHeaderLogout}>
                  <button type="submit" className={styles.ownerLogoutButtonSecondary}>
                    {market === "us" ? "Log out" : "Abmelden"}
                  </button>
                </form>
              </div>
            </div>

            <div className={styles.ownerHeaderStack}>
              <div className={styles.ownerLiteStatus}>
                <span className={styles.ownerLiteStatusDot} />
                <span>{market === "us" ? "Platform healthy" : "Plattform stabil"}</span>
              </div>
              <div className={styles.ownerInstallPrompt}>
                <OwnerInstallPrompt
                  installLabel={market === "us" ? "Install app" : "App installieren"}
                  installedLabel={market === "us" ? "App installed" : "App installiert"}
                  manualLabel={market === "us" ? "Manual install" : "Manuelle Installation"}
                  manualCopy={market === "us"
                    ? "Use the browser menu to install or add Varnito to the desktop."
                    : "Verwenden Sie das Browser-Menü, um Varnito zu installieren oder auf dem Desktop zu platzieren."}
                />
              </div>
            </div>
          </header>

          <section className={styles.ownerKpiGrid} aria-label="Owner KPI overview">
            <article className={styles.ownerKpiCard}>
              <div className={styles.ownerKpiTop}>
                <span className={`${styles.ownerKpiIcon} ${styles.ownerKpiIconBlue}`}><span>€</span></span>
                <span className={styles.ownerKpiLabel}>{market === "us" ? "MRR Germany" : "MRR Deutschland"}</span>
              </div>
              <strong className={styles.ownerKpiValue}>{formatCurrency(data.mrr.de, "EUR")}</strong>
            </article>

            <article className={styles.ownerKpiCard}>
              <div className={styles.ownerKpiTop}>
                <span className={`${styles.ownerKpiIcon} ${styles.ownerKpiIconGreen}`}><span>$</span></span>
                <span className={styles.ownerKpiLabel}>{market === "us" ? "MRR USA" : "MRR USA"}</span>
              </div>
              <strong className={styles.ownerKpiValue}>{formatCurrency(data.mrr.us, "USD")}</strong>
            </article>

            <article className={styles.ownerKpiCard}>
              <div className={styles.ownerKpiTop}>
                <span className={`${styles.ownerKpiIcon} ${styles.ownerKpiIconPurple}`}><span>◎</span></span>
                <span className={styles.ownerKpiLabel}>{market === "us" ? "Active customers" : "Aktive Kunden"}</span>
              </div>
              <strong className={styles.ownerKpiValue}>{data.activeCustomers}</strong>
            </article>

            <article className={styles.ownerKpiCard}>
              <div className={styles.ownerKpiTop}>
                <span className={`${styles.ownerKpiIcon} ${styles.ownerKpiIconAmber}`}><span>◔</span></span>
                <span className={styles.ownerKpiLabel}>{market === "us" ? "Running trials" : "Laufende Testphasen"}</span>
              </div>
              <strong className={styles.ownerKpiValue}>{data.runningTrials}</strong>
            </article>
          </section>

          <section className={styles.ownerSecondaryKpiRow} aria-label="Owner business health">
            <article className={styles.ownerSecondaryKpi}>
              <span className={styles.ownerSecondaryLabel}>{market === "us" ? "Payment risks" : "Zahlungsrisiken"}</span>
              <strong>{data.paymentRisks}</strong>
            </article>
            <article className={styles.ownerSecondaryKpi}>
              <span className={styles.ownerSecondaryLabel}>{market === "us" ? "Cancellations" : "Kündigungen"}</span>
              <strong>{data.scheduledCancellations}</strong>
            </article>
            <article className={styles.ownerSecondaryKpi}>
              <span className={styles.ownerSecondaryLabel}>{market === "us" ? "New companies (7d)" : "Neue Unternehmen (7 Tage)"}</span>
              <strong>{data.newCompaniesLast7d}</strong>
            </article>
            <article className={styles.ownerSecondaryKpi}>
              <span className={styles.ownerSecondaryLabel}>{market === "us" ? "Paying customers" : "Zahlende Kunden"}</span>
              <strong>{growthSummary.payingCustomers}</strong>
            </article>
          </section>

          <section className={styles.ownerContentRow}>
            <article className={styles.ownerPanel}>
              <div className={styles.ownerPanelHeader}>
                <div>
                  <p className={styles.ownerSectionEyebrow}>{market === "us" ? "Overview" : "Übersicht"}</p>
                  <h2 className={styles.ownerSectionTitle}>{market === "us" ? "Growth overview" : "Wachstumsübersicht"}</h2>
                </div>

                <div className={styles.ownerMonthSelector}>
                  <a href={`/operator/owner?month=${encodeURIComponent(monthOptions[Math.max(0, monthOptions.indexOf(selectedMonth) - 1)] ?? selectedMonth)}`} aria-label={market === "us" ? "Previous month" : "Vorheriger Monat"}>‹</a>
                  <span>{monthLabel}</span>
                  <a href={`/operator/owner?month=${encodeURIComponent(monthOptions[Math.min(monthOptions.length - 1, monthOptions.indexOf(selectedMonth) + 1)] ?? selectedMonth)}`} aria-label={market === "us" ? "Next month" : "Nächster Monat"}>›</a>
                </div>
              </div>

              <div className={styles.ownerMetricBreakdown}>
                <div className={styles.ownerMetricTile}>
                  <span>{market === "us" ? "Human visits" : "Menschliche Besuche"}</span>
                  <strong>{growthSummary.visitors}</strong>
                </div>
                <div className={styles.ownerMetricTile}>
                  <span>{market === "us" ? "Demos" : "Demos"}</span>
                  <strong>{growthSummary.demoOpened}</strong>
                </div>
                <div className={styles.ownerMetricTile}>
                  <span>{market === "us" ? "Trials" : "Tests"}</span>
                  <strong>{growthSummary.trialsStarted}</strong>
                </div>
                <div className={styles.ownerMetricTile}>
                  <span>{market === "us" ? "Paying" : "Bezahlend"}</span>
                  <strong>{growthSummary.payingCustomers}</strong>
                </div>
              </div>

              <p className={styles.ownerTrafficSummaryNote}>{market === "us" ? "Human page views by Varnito version" : "Menschliche Seitenaufrufe nach Varnito-Version"}</p>

              <div className={styles.ownerTrafficGrid}>
                {trafficCards.map((card) => (
                  <div key={card.label} className={`${styles.ownerTrafficCard} ${card.tone === "warning" ? styles.ownerTrafficWarning : ""}`}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <small title={card.hint}>{card.hint}</small>
                  </div>
                ))}
              </div>
            </article>

            <aside className={styles.ownerPanel}>
              <div className={styles.ownerPanelHeader}>
                <div>
                  <p className={styles.ownerSectionEyebrow}>{market === "us" ? "Sources" : "Quellen"}</p>
                  <h2 className={styles.ownerSectionTitle}>{market === "us" ? "Source mix" : "Quellenmix"}</h2>
                </div>
              </div>

              {sourceRows.length === 0 ? (
                <p className={styles.ownerMuted}>{market === "us" ? "No source data for the selected period." : "Keine Quellen für den gewählten Zeitraum verfügbar."}</p>
              ) : (
                <div className={styles.ownerSourceList}>
                  {sourceRows.map((source) => (
                    <div key={source.key} className={styles.ownerSourceRow}>
                      <div className={styles.ownerSourceMeta}>
                        <span>{source.label}</span>
                        <strong>{source.visits}</strong>
                      </div>
                      <div className={styles.ownerSourceTrack}>
                        <span className={styles.ownerSourceBar} style={{ width: `${Math.max(8, (source.visits / sourceMax) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </section>

          <section className={styles.ownerHealthGrid} aria-label="Platform health overview">
            {healthCards.map((card) => (
              <article key={card.title} className={`${styles.ownerHealthCard} ${card.state === "good" ? styles.ownerHealthGood : card.state === "warn" ? styles.ownerHealthWarn : styles.ownerHealthNeutral}`}>
                <span className={styles.ownerHealthTitle}>{card.title}</span>
                <strong>{card.value}</strong>
                <small>{card.detail}</small>
              </article>
            ))}
          </section>

          <PartnerMeteringPanel market={market === "us" ? "us" : "de"} data={partnerMeteringData} />

          <section className={styles.ownerLowerGrid}>
            <article className={styles.ownerPanel}>
              <div className={styles.ownerPanelHeader}>
                <div>
                  <p className={styles.ownerSectionEyebrow}>{market === "us" ? "Platform" : "Plattform"}</p>
                  <h2 className={styles.ownerSectionTitle}>{market === "us" ? "Latest errors" : "Letzte Fehler"}</h2>
                </div>
              </div>

              {data.lastErrors.length === 0 ? (
                <div className={styles.ownerEmptyState}>
                  <strong>{market === "us" ? "✓ No recent errors" : "✓ Keine aktuellen Fehler"}</strong>
                  <span>{market === "us" ? "Queue health is clean." : "Die Queue-Health ist stabil."}</span>
                </div>
              ) : (
                <div className={styles.ownerErrorList}>
                  {data.lastErrors.slice(0, 4).map((entry) => (
                    <div key={entry.id} className={styles.ownerErrorItem}>
                      <div>
                        <strong>{entry.message}</strong>
                        <span>{entry.companyId}</span>
                      </div>
                      <time>{formatTimestamp(entry.updatedAt, locale)}</time>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <div className={styles.ownerSideStack}>
              <article className={styles.ownerPanel}>
                <div className={styles.ownerPanelHeader}>
                  <div>
                    <p className={styles.ownerSectionEyebrow}>{market === "us" ? "Inbox" : "Posteingang"}</p>
                    <h2 className={styles.ownerSectionTitle}>{market === "us" ? "Mail Inbox" : "Mail Posteingang"}</h2>
                  </div>
                  <Link href="/operator/support" className={styles.ownerInlineLink}>{market === "us" ? "All mails" : "Alle Mails"}</Link>
                </div>

                <div className={styles.ownerMailCounts}>
                  <span>{market === "us" ? "Important" : "Wichtig"}<strong>{mailCounts.important}</strong></span>
                  <span>{market === "us" ? "Review" : "Prüfen"}<strong>{mailCounts.review}</strong></span>
                  <span>{market === "us" ? "Sales" : "Verkauf"}<strong>{mailCounts.sales}</strong></span>
                  <span>Spam<strong>{mailCounts.spam}</strong></span>
                </div>

                {inboxPreview.length === 0 ? (
                  <p className={styles.ownerMuted}>{market === "us" ? "No inbound mail yet." : "Noch keine eingehenden Mails."}</p>
                ) : (
                  <div className={styles.ownerInboxList}>
                    {inboxPreview.map((thread) => (
                      <div key={String(thread.id)} className={styles.ownerInboxItem}>
                        <div className={styles.ownerInboxMeta}>
                          <strong>{String(thread.customer_email ?? "Unknown sender")}</strong>
                          <span>{String(thread.triage_bucket ?? "review")}</span>
                        </div>
                        <p>{String(thread.subject ?? "Support request")}</p>
                        <small>{String(thread.triage_summary ?? "No summary")}</small>
                        <time>{formatTimestamp(String(thread.last_message_at ?? thread.created_at), locale)}</time>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className={styles.ownerPanel}>
                <div className={styles.ownerPanelHeader}>
                  <div>
                    <p className={styles.ownerSectionEyebrow}>{market === "us" ? "Signals" : "Meldungen"}</p>
                    <h2 className={styles.ownerSectionTitle}>{market === "us" ? "Recent notifications" : "Aktuelle Benachrichtigungen"}</h2>
                  </div>
                  <Link href="/operator/notifications" className={styles.ownerInlineLink}>{market === "us" ? "All" : "Alle"}</Link>
                </div>

                {recentNotifications.length === 0 ? (
                  <p className={styles.ownerMuted}>{market === "us" ? "No recent business notifications." : "Keine aktuellen Geschäftsbemerkungen."}</p>
                ) : (
                  <div className={styles.ownerNotificationList}>
                    {recentNotifications.map((notification) => (
                      <div key={notification.id} className={`${styles.ownerNotificationItem} ${notification.is_read ? styles.ownerNotificationRead : styles.ownerNotificationUnread}`}>
                        <div className={styles.ownerNotificationHeader}>
                          <strong>{notification.title}</strong>
                          <span>{notification.is_read ? (market === "us" ? "Read" : "Gelesen") : (market === "us" ? "Unread" : "Ungelesen")}</span>
                        </div>
                        <p>{notification.message}</p>
                        <time>{new Date(notification.created_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}</time>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className={styles.ownerPanel}>
                <div className={styles.ownerPanelHeader}>
                  <div>
                    <p className={styles.ownerSectionEyebrow}>{market === "us" ? "Visits" : "Besuche"}</p>
                    <h2 className={styles.ownerSectionTitle}>{market === "us" ? "Recent real visits" : "Letzte echte Besuche"}</h2>
                  </div>
                </div>

                {recentHumanVisits.length === 0 ? (
                  <p className={styles.ownerMuted}>{market === "us" ? "No genuine browser visits yet." : "Noch keine echten Browser-Besuche."}</p>
                ) : (
                  <div className={styles.ownerRecentVisitList}>
                    {recentHumanVisits.slice(0, 8).map((visit, index) => {
                      const visitMarket = visit.market === "de" ? "DE-Seite" : visit.market === "us" ? "US-Seite" : "Unbekannte Site";
                      const visitSource = sourceLabels[visit.source] ?? visit.source;
                      return (
                        <div key={`${visit.occurredAt}-${index}`} className={styles.ownerRecentVisitItem}>
                          <span>{new Date(visit.occurredAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}</span>
                          <span>{visitMarket}</span>
                          <span>{visitSource}</span>
                          <span className={styles.ownerRecentVisitStatus}>{market === "us" ? "Human" : "Mensch"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className={styles.ownerPanel}>
                <div className={styles.ownerPanelHeader}>
                  <div>
                    <p className={styles.ownerSectionEyebrow}>{market === "us" ? "Status" : "Status"}</p>
                    <h2 className={styles.ownerSectionTitle}>{market === "us" ? "Current warnings" : "Aktuelle Warnungen"}</h2>
                  </div>
                </div>

                {warnings.length > 0 && warnings[0] && warnings[0].length > 0 ? (
                  <div className={styles.ownerWarningList}>
                    {warnings.slice(0, 3).map((warning) => (
                      <div key={warning} className={styles.ownerWarningItem}>{warning}</div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.ownerWarningGood}>{market === "us" ? "No current warnings." : "Aktuell keine Warnungen."}</div>
                )}
              </article>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}