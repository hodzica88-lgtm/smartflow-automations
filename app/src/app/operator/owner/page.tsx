import Link from "next/link";

import {
  GROWTH_SOURCES,
  getGrowthMonthOptions,
  getGrowthMonthRange,
  getMonthKeyInBerlin,
} from "@/features/analytics/growth";
import { logoutAction } from "@/features/auth/actions";
import OwnerInstallPrompt from "@/features/operator/OwnerInstallPrompt";
import { requireOperatorUser } from "@/features/operator/access";
import { listOwnerBusinessNotifications } from "@/features/notifications/service";
import { getOwnerControlCenterData, getOwnerGrowthMonthData } from "@/features/operator/data";
import { getInboxPreview, getSupportInboxCounts } from "@/features/support/service";
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
  const recentNotifications = await listOwnerBusinessNotifications(5);
  const [mailCounts, inboxPreview] = await Promise.all([
    getSupportInboxCounts(),
    getInboxPreview(5),
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
  const marketBreakdown = growthReport.summary?.markets ?? { de: 0, us: 0, unknown: 0 };
  const browserVisits = growthReport.summary?.visitors ?? 0;
  const botVisits = growthReport.summary?.botVisitors ?? 0;
  const unknownVisits = growthReport.summary?.unknownVisitors ?? 0;
  const demoCount = growthReport.summary?.demoOpened ?? 0;
  const trialCount = growthReport.summary?.trialsStarted ?? 0;
  const payingCount = growthReport.summary?.payingCustomers ?? 0;
  const otherBreakdownEntries = Object.entries(growthReport.summary?.otherBreakdown ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <main className={styles.shell}>
      <section className={styles.header} aria-labelledby="owner-dashboard-title">
        <div className={styles.topRow}>
          <div>
            <VarnitoLogo href="/operator/owner" subtitle={market === "us" ? "Dashboard" : "Dashboard"} />
            <h1 className={styles.title} id="owner-dashboard-title">Dashboard</h1>
            <p className={styles.copy}>
              {market === "us"
                ? "One compact view for recurring revenue, growth, customer health, and platform status."
                : "Eine kompakte Übersicht für wiederkehrende Umsätze, Wachstum, Kundenstatus und Plattformzustand."}
            </p>
            <p className={styles.muted}>{operator.email ?? operator.id}</p>
          </div>
          <nav className={styles.actions} aria-label={market === "us" ? "Owner navigation" : "Owner-Navigation"}>
            <Link className={styles.linkButton} href="/operator/owner">Dashboard</Link>
            <Link className={styles.linkButton} href="/dashboard">{market === "us" ? "Customer dashboard" : "Kundendashboard"}</Link>
            <Link className={styles.linkButton} href="/operator/notifications">{market === "us" ? "Notifications" : "Benachrichtigungen"}</Link>
            <form action={logoutAction}>
              <button className="premium-button" type="submit">
                {market === "us" ? "Log out" : "Abmelden"}
              </button>
            </form>
          </nav>
        </div>

        <OwnerInstallPrompt
          installLabel={market === "us" ? "Install Varnito on this computer" : "Varnito auf diesem PC installieren"}
          installedLabel={market === "us" ? "Varnito is installed" : "Varnito ist installiert"}
          manualLabel={market === "us" ? "Manual install" : "Manuelle Installation"}
          manualCopy={market === "us"
            ? "If the install prompt is not available, use the browser menu and choose Install app or Add to desktop."
            : "Falls kein Installationsdialog erscheint, öffnen Sie das Browser-Menü und wählen Sie App installieren oder Zum Desktop hinzufügen."}
        />
      </section>

      <section className={styles.grid} aria-label="Owner control center metrics">
        <article className={`${styles.panel} ${styles.span4}`}>
          <p className={styles.metricLabel}>MRR Deutschland</p>
          <p className={styles.metricValue}>{formatCurrency(data.mrr.de, "EUR")}</p>
        </article>
        <article className={`${styles.panel} ${styles.span4}`}>
          <p className={styles.metricLabel}>MRR USA</p>
          <p className={styles.metricValue}>{formatCurrency(data.mrr.us, "USD")}</p>
        </article>
        <article className={`${styles.panel} ${styles.span4}`}>
          <p className={styles.metricLabel}>{market === "us" ? "Active customers" : "Aktive Kunden"}</p>
          <p className={styles.metricValue}>{data.activeCustomers}</p>
        </article>

        <article className={`${styles.panel} ${styles.span4}`}>
          <p className={styles.metricLabel}>{market === "us" ? "Running trials" : "Laufende Testphasen"}</p>
          <p className={styles.metricValue}>{data.runningTrials}</p>
        </article>
        <article className={`${styles.panel} ${styles.span4}`}>
          <p className={styles.metricLabel}>{market === "us" ? "Payment risks" : "Zahlungsrisiken"}</p>
          <p className={styles.metricValue}>{data.paymentRisks}</p>
        </article>
        <article className={`${styles.panel} ${styles.span4}`}>
          <p className={styles.metricLabel}>{market === "us" ? "Scheduled cancellations" : "Kündigungen"}</p>
          <p className={styles.metricValue}>{data.scheduledCancellations}</p>
        </article>

        <article className={`${styles.panel} ${styles.span4}`}>
          <p className={styles.metricLabel}>{market === "us" ? "New companies (7d)" : "Neue Unternehmen (7 Tage)"}</p>
          <p className={styles.metricValue}>{data.newCompaniesLast7d}</p>
        </article>
        <article className={`${styles.panel} ${styles.span4}`}>
          <p className={styles.metricLabel}>{market === "us" ? "Visits DE" : "Besuche DE"}</p>
          <p className={styles.metricValue}>{marketBreakdown.de}</p>
          <p className={styles.statusMeta}>{monthRange.monthKey} · {market === "us" ? "selected month" : "gewählter Monat"}</p>
        </article>
        <article className={`${styles.panel} ${styles.span4}`}>
          <p className={styles.metricLabel}>{market === "us" ? "Visits US" : "Besuche US"}</p>
          <p className={styles.metricValue}>{marketBreakdown.us}</p>
          <p className={styles.statusMeta}>{monthRange.monthKey} · {market === "us" ? "selected month" : "gewählter Monat"}</p>
        </article>

        <article className={`${styles.panel} ${styles.span4}`}>
          <div className={styles.monthSelectorRow}>
            <span className={styles.metricLabel}>{market === "us" ? "Growth month" : "Wachstumsmonat"}</span>
            <div className={styles.monthButtons}>
              <a className={styles.linkButton} href={`/operator/owner?month=${encodeURIComponent(monthOptions[Math.max(0, monthOptions.indexOf(selectedMonth) - 1)] ?? selectedMonth)}`} aria-label={market === "us" ? "Previous month" : "Vorheriger Monat"}>‹</a>
              <span className={styles.monthLabel}>{monthRange.monthKey === "2026-09" ? "September 2026" : monthRange.monthKey}</span>
              <a className={styles.linkButton} href={`/operator/owner?month=${encodeURIComponent(monthOptions[Math.min(monthOptions.length - 1, monthOptions.indexOf(selectedMonth) + 1)] ?? selectedMonth)}`} aria-label={market === "us" ? "Next month" : "Nächster Monat"}>›</a>
            </div>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.span6}`}>
          <h2 className={styles.sectionTitle}>{market === "us" ? "Growth overview" : "Wachstumsübersicht"}</h2>
          <div className={styles.summaryGrid}>
            <div>
              <p className={styles.metricLabel}>{market === "us" ? "Browser visits" : "Browser-Besuche"}</p>
              <p className={styles.metricValueSmall}>{browserVisits}</p>
              <p className={styles.statusMeta}>{growthReport.previousSummary ? `${browserVisits - (growthReport.previousSummary.visitors ?? 0)} vs previous month` : market === "us" ? "No previous baseline" : "Keine vorherige Basis"}</p>
            </div>
            <div>
              <p className={styles.metricLabel}>{market === "us" ? "Bot visits" : "Bot-Besuche"}</p>
              <p className={styles.metricValueSmall}>{botVisits}</p>
              <p className={styles.statusMeta}>{growthReport.previousSummary ? `${botVisits - (growthReport.previousSummary.botVisitors ?? 0)} vs previous month` : market === "us" ? "No previous baseline" : "Keine vorherige Basis"}</p>
            </div>
            <div>
              <p className={styles.metricLabel}>{market === "us" ? "Unknown traffic" : "Unbekannt"}</p>
              <p className={styles.metricValueSmall}>{unknownVisits}</p>
              <p className={styles.statusMeta}>{growthReport.previousSummary ? `${unknownVisits - (growthReport.previousSummary.unknownVisitors ?? 0)} vs previous month` : market === "us" ? "No previous baseline" : "Keine vorherige Basis"}</p>
            </div>
            <div>
              <p className={styles.metricLabel}>{market === "us" ? "Demos" : "Demos"}</p>
              <p className={styles.metricValueSmall}>{demoCount}</p>
              <p className={styles.statusMeta}>{growthReport.previousSummary ? `${demoCount - (growthReport.previousSummary.demoOpened ?? 0)} vs previous month` : market === "us" ? "No previous baseline" : "Keine vorherige Basis"}</p>
            </div>
            <div>
              <p className={styles.metricLabel}>{market === "us" ? "Trials" : "Tests"}</p>
              <p className={styles.metricValueSmall}>{trialCount}</p>
              <p className={styles.statusMeta}>{growthReport.previousSummary ? `${trialCount - (growthReport.previousSummary.trialsStarted ?? 0)} vs previous month` : market === "us" ? "No previous baseline" : "Keine vorherige Basis"}</p>
            </div>
            <div>
              <p className={styles.metricLabel}>{market === "us" ? "Paying" : "Bezahlend"}</p>
              <p className={styles.metricValueSmall}>{payingCount}</p>
              <p className={styles.statusMeta}>{growthReport.previousSummary ? `${payingCount - (growthReport.previousSummary.payingCustomers ?? 0)} vs previous month` : market === "us" ? "No previous baseline" : "Keine vorherige Basis"}</p>
            </div>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.span6}`}>
          <h2 className={styles.sectionTitle}>{market === "us" ? "Source mix" : "Quellenmix"}</h2>
          <div className={styles.sourceList}>
            {GROWTH_SOURCES.filter((source) => {
              if (["producthunt", "g2", "capterra", "getapp", "softwareadvice", "saasworthy", "sourceforge", "slashdot", "google", "direct", "other"].includes(source)) {
                return true;
              }

              const summary = growthReport.summary?.sources?.[source] ?? EMPTY_SOURCE_METRICS;
              return [summary.visitors, summary.botVisitors, summary.unknownVisitors, summary.demos, summary.trials, summary.paid, summary.trialCancellations, summary.subscriptionCancellations].some((value) => value > 0);
            }).map((source) => {
              const summary = growthReport.summary?.sources?.[source] ?? EMPTY_SOURCE_METRICS;
              return (
                <div key={source} className={styles.sourceRow}>
                  <div className={styles.sourceMeta}>
                    <strong>{sourceLabels[source]}</strong>
                    <span>{summary.visitors} {market === "us" ? "visits" : "Besuche"}</span>
                  </div>
                  <span className={styles.sourceMetrics}>{summary.demos} demo / {summary.trials} trial / {summary.paid} paid</span>
                </div>
              );
            })}
          </div>
          {otherBreakdownEntries.length > 0 ? (
            <div className={styles.sourceList}>
              <h3 className={styles.sectionTitle}>{market === "us" ? "Other sources" : "Andere Quellen"}</h3>
              {otherBreakdownEntries.map(([host, count]) => (
                <div key={host} className={styles.sourceRow}>
                  <div className={styles.sourceMeta}>
                    <strong>{host}</strong>
                    <span>{count} {market === "us" ? "visits" : "Besuche"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <article className={`${styles.panel} ${styles.span4}`}>
          <h2 className={styles.sectionTitle}>{market === "us" ? "Server status" : "Serverstatus"}</h2>
          <span className={data.serverStatus === "ok" ? styles.badgeOk : styles.badgeWarn}>
            {data.serverStatus === "ok" ? (market === "us" ? "Operational" : "Betriebsbereit") : (market === "us" ? "Degraded" : "Beeinträchtigt")}
          </span>
        </article>
        <article className={`${styles.panel} ${styles.span4}`}>
          <h2 className={styles.sectionTitle}>{market === "us" ? "Health status" : "Health-Status"}</h2>
          <span className={data.healthStatus === "ok" ? styles.badgeOk : styles.badgeWarn}>
            {data.healthStatus === "ok" ? "OK" : (market === "us" ? "Degraded" : "Beeinträchtigt")}
          </span>
        </article>
        <article className={`${styles.panel} ${styles.span4}`}>
          <h2 className={styles.sectionTitle}>{market === "us" ? "Queue status" : "Queue-Status"}</h2>
          <p className={styles.muted}>Due: {data.queue.due} · Failed 24h: {data.queue.failed24h} · Stale: {data.queue.stale}</p>
        </article>

        <article className={`${styles.panel} ${styles.span8}`}>
          <h2 className={styles.sectionTitle}>{market === "us" ? "Latest errors" : "Letzte Fehler"}</h2>
          {data.lastErrors.length === 0 ? (
            <p className={styles.muted}>{market === "us" ? "No recent failed queue deliveries." : "Keine fehlgeschlagenen Queue-Zustellungen in den letzten 24 Stunden."}</p>
          ) : (
            data.lastErrors.map((entry) => (
              <div className={styles.errorRow} key={entry.id}>
                <strong>{entry.message}</strong>
                <span className={styles.statusMeta}>Company {entry.companyId} · {formatTimestamp(entry.updatedAt, locale)}</span>
              </div>
            ))
          )}
        </article>

        <article className={`${styles.panel} ${styles.span4}`}>
          <h2 className={styles.sectionTitle}>{market === "us" ? "Backup" : "Sicherung"}</h2>
          <span className={data.lastBackup.status === "Aktuell" ? styles.badgeOk : styles.badgeWarn}>
            {data.lastBackup.status}
          </span>
          <div className={styles.statusRow}>
            <strong>{data.lastBackup.label}</strong>
            <span className={styles.statusMeta}>
              {data.lastBackup.checkedAt ? formatTimestamp(data.lastBackup.checkedAt, locale) : (market === "us" ? "Unavailable" : "Unbekannt")}
            </span>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.span12}`} id="mail-inbox">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{market === "us" ? "Mail Inbox" : "Mail Posteingang"}</h2>
            <Link className={styles.linkButton} href="/operator/support">{market === "us" ? "All mails" : "Alle Mails"}</Link>
          </div>
          <div className={styles.mailCounts}>
            <div className={styles.mailCountCard}><span>{market === "us" ? "Important" : "Wichtig"}</span><strong>{mailCounts.important}</strong></div>
            <div className={styles.mailCountCard}><span>{market === "us" ? "Review" : "Prüfen"}</span><strong>{mailCounts.review}</strong></div>
            <div className={styles.mailCountCard}><span>{market === "us" ? "Sales" : "Verkauf"}</span><strong>{mailCounts.sales}</strong></div>
            <div className={styles.mailCountCard}><span>Spam</span><strong>{mailCounts.spam}</strong></div>
          </div>
          {inboxPreview.length === 0 ? (
            <p className={styles.muted}>{market === "us" ? "No inbound mail yet." : "Noch keine eingehenden Mails."}</p>
          ) : (
            <div className={styles.notificationList}>
              {inboxPreview.map((thread) => (
                <div key={String(thread.id)} className={styles.notificationItem}>
                  <div className={styles.notificationHeader}>
                    <strong>{String(thread.customer_email ?? "Unknown sender")}</strong>
                    <span className={styles.mailBadge}>{String(thread.triage_bucket ?? "review")}</span>
                  </div>
                  <p className={styles.notificationBody}>{String(thread.subject ?? "Support request")}</p>
                  <p className={styles.notificationBody}>{String(thread.triage_summary ?? "No summary")}</p>
                  <div className={styles.notificationMeta}>
                    <span>{String(thread.triage_action ?? "review")} · {String(thread.triage_category ?? thread.category ?? "unclear")}</span>
                    <span>{formatTimestamp(String(thread.last_message_at ?? thread.created_at), locale)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={`${styles.panel} ${styles.span12}`} id="recent-notifications">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{market === "us" ? "Recent Notifications" : "Aktuelle Benachrichtigungen"}</h2>
            <Link className={styles.linkButton} href="/operator/notifications">
              {market === "us" ? "View all notifications" : "Alle Benachrichtigungen anzeigen"}
            </Link>
          </div>
          {recentNotifications.length === 0 ? (
            <p className={styles.muted}>{market === "us" ? "No recent business notifications." : "Keine aktuellen Geschäftsbemerkungen."}</p>
          ) : (
            <div className={styles.notificationList}>
              {recentNotifications.map((notification) => (
                <div key={notification.id} className={`${styles.notificationItem} ${notification.is_read ? styles.notificationRead : styles.notificationUnread}`}>
                  <div className={styles.notificationHeader}>
                    <strong>{notification.title}</strong>
                    <span className={styles.notificationStatus}>{notification.is_read ? (market === "us" ? "Read" : "Gelesen") : (market === "us" ? "Unread" : "Ungelesen")}</span>
                  </div>
                  <p className={styles.notificationBody}>{notification.message}</p>
                  <div className={styles.notificationMeta}>
                    <span>{new Date(notification.created_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={`${styles.panel} ${styles.span12}`} id="notifications">
          <h2 className={styles.sectionTitle}>{market === "us" ? "Current warnings" : "Aktuelle Warnungen"}</h2>
          <ul className={styles.list}>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className={styles.footerCard}>
        <h2 className={styles.sectionTitle}>{market === "us" ? "Windows setup" : "Windows Start"}</h2>
        <ol className={styles.instructionList}>
          <li>{market === "us" ? "After installation, open the Windows Start menu, find Varnito Control Center, and drag it to the desktop to create a shortcut." : "Nach der Installation öffnen Sie das Windows-Startmenü, suchen Varnito Control Center und ziehen den Eintrag auf den Desktop, um eine Verknüpfung zu erstellen."}</li>
          <li>{market === "us" ? "Right-click the app icon in the taskbar and choose Pin to taskbar." : "Klicken Sie mit der rechten Maustaste auf das App-Symbol in der Taskleiste und wählen Sie An Taskleiste anheften."}</li>
          <li>{market === "us" ? "For optional auto-start, add the desktop shortcut to the Windows Startup folder only if the owner explicitly wants that behavior." : "Für optionalen Autostart legen Sie die Desktop-Verknüpfung nur auf ausdrücklichen Wunsch in den Windows-Autostart-Ordner."}</li>
        </ol>
      </section>
    </main>
  );
}