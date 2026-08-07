import Link from "next/link";

import { logoutAction } from "@/features/auth/actions";
import OwnerInstallPrompt from "@/features/operator/OwnerInstallPrompt";
import { requireOperatorUser } from "@/features/operator/access";
import { getOwnerControlCenterData } from "@/features/operator/data";
import { getRequestMarket } from "@/shared/i18n/request";

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

export default async function OwnerControlCenterPage() {
  const { market } = await getRequestMarket();
  const locale = market === "us" ? "en-US" : "de-DE";
  const operator = await requireOperatorUser({ nextPath: "/operator/owner" });
  const data = await getOwnerControlCenterData();

  const warnings = data.warnings.length > 0 ? data.warnings : [market === "us" ? "No current warnings." : "Aktuell keine Warnungen."];

  return (
    <main className={styles.shell}>
      <section className={styles.header} aria-labelledby="owner-control-center-title">
        <div className={styles.topRow}>
          <div>
            <p className={styles.eyebrow}>{market === "us" ? "Owner desktop" : "Owner Desktop"}</p>
            <h1 className={styles.title} id="owner-control-center-title">Varnito Control Center</h1>
            <p className={styles.copy}>
              {market === "us"
                ? "One compact owner view for recurring revenue, company health, queue risk, and platform status."
                : "Eine kompakte Owner-Ansicht für wiederkehrende Umsätze, Firmenzustand, Queue-Risiken und Plattformstatus."}
            </p>
            <p className={styles.muted}>{operator.email ?? operator.id}</p>
          </div>
          <div className={styles.actions}>
            <Link className={styles.linkButton} href="/operator">Operator</Link>
            <Link className={styles.linkButton} href="/dashboard">Dashboard</Link>
            <form action={logoutAction}>
              <button className="premium-button" type="submit">
                {market === "us" ? "Log out" : "Abmelden"}
              </button>
            </form>
          </div>
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
          <p className={styles.metricLabel}>Analytics DE</p>
          <p className={styles.metricValue}>{data.analytics.de30d}</p>
          <p className={styles.statusMeta}>{market === "us" ? "30-day events" : "30-Tage-Events"} · 7d: {data.analytics.de7d}</p>
        </article>
        <article className={`${styles.panel} ${styles.span4}`}>
          <p className={styles.metricLabel}>Analytics US</p>
          <p className={styles.metricValue}>{data.analytics.us30d}</p>
          <p className={styles.statusMeta}>{market === "us" ? "30-day events" : "30-Tage-Events"} · 7d: {data.analytics.us7d}</p>
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
          <h2 className={styles.sectionTitle}>{market === "us" ? "Latest backup" : "Letzte Sicherung"}</h2>
          <div className={styles.statusRow}>
            <strong>{data.lastBackup.label}</strong>
            <span className={styles.statusMeta}>{formatTimestamp(data.lastBackup.checkedAt, locale)}</span>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.span12}`}>
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