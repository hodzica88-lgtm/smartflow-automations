import Link from "next/link";
import { redirect } from "next/navigation";

import { getCustomerAnalyticsData } from "@/features/analytics/data";
import { getCustomerValueSettings } from "@/features/customer-value/service";
import { getUserCompanyState } from "@/features/onboarding/company";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import styles from "./analytics.module.css";

export const dynamic = "force-dynamic";

const getCompanyId = async () => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/analytics");
  }

  const companyState = await getUserCompanyState(user.id);

  if (!companyState.companyId) {
    redirect("/onboarding");
  }

  return companyState.companyId;
};

const formatDate = (value: string, timezone: string) => {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeZone: "Europe/Berlin",
    }).format(new Date(value));
  }
};

const formatRate = (value: number | null) =>
  value === null ? "—" : `${Math.round(value * 100)} %`;

const formatCurrency = (cents: number | null) => {
  if (cents === null) {
    return "—";
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

const formatCountChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? "0 %" : "Neu";
  }

  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change} %`;
};

const formatRateChange = (current: number | null, previous: number | null) => {
  if (current === null || previous === null) {
    return "—";
  }

  const change = Math.round((current - previous) * 100);
  return `${change > 0 ? "+" : ""}${change} Prozentpunkte`;
};

const formatDuration = (minutes: number | null) => {
  if (minutes === null) {
    return "Noch nicht messbar";
  }

  if (minutes < 60) {
    return `${minutes} Min.`;
  }

  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours} Std. ${remainingMinutes} Min.`
      : `${hours} Std.`;
  }

  const days = Math.floor(minutes / (24 * 60));
  const remainingHours = Math.floor((minutes % (24 * 60)) / 60);
  return remainingHours > 0 ? `${days} T. ${remainingHours} Std.` : `${days} T.`;
};

const formatResponseComparison = (current: number | null, previous: number | null) => {
  if (current === null || previous === null) {
    return "—";
  }

  const difference = current - previous;

  if (difference === 0) {
    return "Unverändert";
  }

  return difference < 0
    ? `${formatDuration(Math.abs(difference))} schneller`
    : `${formatDuration(difference)} langsamer`;
};

export default async function AnalyticsPage() {
  const companyId = await getCompanyId();
  const [analytics, valueSettings] = await Promise.all([
    getCustomerAnalyticsData(companyId),
    getCustomerValueSettings(companyId),
  ]);
  const currentPeriod = `${formatDate(analytics.periodStart, analytics.timezone)} bis ${formatDate(
    analytics.periodEnd,
    analytics.timezone,
  )}`;
  const previousPeriod = `${formatDate(
    analytics.previousPeriodStart,
    analytics.timezone,
  )} bis ${formatDate(analytics.periodStart, analytics.timezone)}`;
  const hasCurrentLeads = analytics.current.total > 0;
  const jobsWon = analytics.successfulOutcomes.find((outcome) => outcome.key === "job_won")?.count ?? 0;
  const estimatedWonOrderValueCents =
    valueSettings.averageOrderValueCents === null
      ? null
      : jobsWon * valueSettings.averageOrderValueCents;
  const netBenefitCents =
    estimatedWonOrderValueCents === null || valueSettings.monthlyVarnitoCostCents === null
      ? null
      : estimatedWonOrderValueCents - valueSettings.monthlyVarnitoCostCents;
  const roiPercent =
    netBenefitCents === null || valueSettings.monthlyVarnitoCostCents === null
      ? null
      : (netBenefitCents / valueSettings.monthlyVarnitoCostCents) * 100;
  const valueMultiple =
    estimatedWonOrderValueCents === null || valueSettings.monthlyVarnitoCostCents === null
      ? null
      : estimatedWonOrderValueCents / valueSettings.monthlyVarnitoCostCents;

  const comparisonRows = [
    {
      label: "Anfragen insgesamt",
      current: String(analytics.current.total),
      previous: String(analytics.previous.total),
      change: formatCountChange(analytics.current.total, analytics.previous.total),
    },
    {
      label: "Erfolgreich abgeschlossen",
      current: String(analytics.current.successful),
      previous: String(analytics.previous.successful),
      change: formatCountChange(analytics.current.successful, analytics.previous.successful),
    },
    {
      label: "Nicht erfolgreich",
      current: String(analytics.current.unsuccessful),
      previous: String(analytics.previous.unsuccessful),
      change: formatCountChange(analytics.current.unsuccessful, analytics.previous.unsuccessful),
    },
    {
      label: "Noch offen",
      current: String(analytics.current.open),
      previous: String(analytics.previous.open),
      change: formatCountChange(analytics.current.open, analytics.previous.open),
    },
    {
      label: "Erfolgsquote abgeschlossener Anfragen",
      current: formatRate(analytics.current.successRate),
      previous: formatRate(analytics.previous.successRate),
      change: formatRateChange(analytics.current.successRate, analytics.previous.successRate),
    },
    {
      label: "Abschlussquote aller Anfragen",
      current: formatRate(analytics.current.completionRate),
      previous: formatRate(analytics.previous.completionRate),
      change: formatRateChange(analytics.current.completionRate, analytics.previous.completionRate),
    },
  ];

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.backLink} href="/dashboard">
          ← Zurück zum Dashboard
        </Link>
        <p className={styles.eyebrow}>Kundenauswertung</p>
        <h1 className={styles.title}>Auswertungen</h1>
        <p className={styles.copy}>
          Entwicklung, Ergebnisse und Reaktionszeiten für {analytics.companyName}.
        </p>
        <p className={styles.period}>Aktueller Zeitraum: {currentPeriod}</p>
      </header>

      {!hasCurrentLeads ? (
        <section className={styles.section} aria-label="Keine aktuellen Auswertungsdaten">
          <h2>Noch keine Anfragen im aktuellen Zeitraum</h2>
          <p>
            Sobald Anfragen eingehen und bearbeitet werden, entstehen hier belastbare
            Auswertungen.
          </p>
        </section>
      ) : null}

      <section className={styles.metrics} aria-label="Kennzahlen der letzten 30 Tage">
        <article className={styles.metricCard}>
          <p>Anfragen</p>
          <strong>{analytics.current.total}</strong>
          <span>{formatCountChange(analytics.current.total, analytics.previous.total)} zum Vorzeitraum</span>
        </article>
        <article className={styles.metricCard}>
          <p>Erfolgreich</p>
          <strong>{analytics.current.successful}</strong>
          <span>{formatRate(analytics.current.successRate)} der abgeschlossenen Anfragen</span>
        </article>
        <article className={styles.metricCard}>
          <p>Noch offen</p>
          <strong>{analytics.current.open}</strong>
          <span>{formatRate(analytics.current.completionRate)} Abschlussquote</span>
        </article>
        <article className={styles.metricCard}>
          <p>Ø Erstreaktion</p>
          <strong className={styles.durationValue}>{formatDuration(analytics.response.averageMinutes)}</strong>
          <span>
            {analytics.response.measurableLeads} von {analytics.response.totalLeads} messbar
          </span>
        </article>
      </section>

      <section className={styles.section} aria-labelledby="value-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="value-title">Nutzen und ROI</h2>
            <p>Geldwerte nur aus Anfragen mit dem Ergebnis „Auftrag erhalten“.</p>
          </div>
          <Link className={styles.backLink} href="/dashboard/analytics/value">
            {valueSettings.averageOrderValueCents === null ? "Werte hinterlegen" : "Werte ändern"}
          </Link>
        </div>

        {valueSettings.averageOrderValueCents === null ? (
          <p>
            Hinterlegen Sie Ihren durchschnittlichen Auftragswert, damit Varnito den geschätzten
            Wert gewonnener Aufträge berechnen kann. Ohne echte Eingabe wird kein Geldwert angezeigt.
          </p>
        ) : (
          <>
            <div className={styles.detailGrid}>
              <article className={styles.detailCard}>
                <span>Aufträge erhalten</span>
                <strong>{jobsWon}</strong>
                <small>Nur erfolgreiche Anfragen mit dem Ergebnis „Auftrag erhalten“.</small>
              </article>
              <article className={styles.detailCard}>
                <span>Ø Auftragswert</span>
                <strong>{formatCurrency(valueSettings.averageOrderValueCents)}</strong>
                <small>Vom Kunden gepflegter Durchschnittswert.</small>
              </article>
              <article className={styles.detailCard}>
                <span>Geschätzter Auftragswert</span>
                <strong>{formatCurrency(estimatedWonOrderValueCents)}</strong>
                <small>{jobsWon} gewonnene Aufträge × durchschnittlicher Auftragswert.</small>
              </article>
              <article className={styles.detailCard}>
                <span>Monatliche Varnito-Kosten</span>
                <strong>{formatCurrency(valueSettings.monthlyVarnitoCostCents)}</strong>
                <small>Tatsächlicher, vom Kunden gepflegter Rechnungsbetrag.</small>
              </article>
              <article className={styles.detailCard}>
                <span>Geschätzter Netto-Nutzen</span>
                <strong>{formatCurrency(netBenefitCents)}</strong>
                <small>Geschätzter Auftragswert abzüglich monatlicher Varnito-Kosten.</small>
              </article>
              <article className={styles.detailCard}>
                <span>Geschätzter ROI</span>
                <strong>{roiPercent === null ? "—" : `${Math.round(roiPercent)} %`}</strong>
                <small>
                  {valueMultiple === null
                    ? "Monatliche Varnito-Kosten fehlen noch."
                    : `${valueMultiple.toLocaleString("de-DE", { maximumFractionDigits: 1 })}-facher Auftragswert im Verhältnis zu den Kosten.`}
                </small>
              </article>
            </div>
            <p className={styles.note}>
              Diese Werte sind eine nachvollziehbare Schätzung auf Basis des gepflegten
              Durchschnittswerts. Sie ersetzen keine Buchhaltung und behaupten keinen tatsächlich
              bezahlten Umsatz.
            </p>
          </>
        )}
      </section>

      <section className={styles.section} aria-labelledby="comparison-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="comparison-title">Vergleich zum Vorzeitraum</h2>
            <p>Aktuelle 30 Tage im Vergleich mit den 30 Tagen davor.</p>
          </div>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kennzahl</th>
                <th>Aktuell</th>
                <th>Vorher</th>
                <th>Veränderung</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.current}</td>
                  <td>{row.previous}</td>
                  <td>{row.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.note}>Vorzeitraum: {previousPeriod}</p>
      </section>

      <section className={styles.section} aria-labelledby="response-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="response-title">Reaktionszeiten</h2>
            <p>Wie schnell neue Anfragen erstmals im System bearbeitet wurden.</p>
          </div>
        </div>
        <div className={styles.detailGrid}>
          <article className={styles.detailCard}>
            <span>Durchschnitt</span>
            <strong>{formatDuration(analytics.response.averageMinutes)}</strong>
            <small>
              {formatResponseComparison(
                analytics.response.averageMinutes,
                analytics.previousResponse.averageMinutes,
              )} als im Vorzeitraum
            </small>
          </article>
          <article className={styles.detailCard}>
            <span>Median</span>
            <strong>{formatDuration(analytics.response.medianMinutes)}</strong>
            <small>Der mittlere Wert ist weniger anfällig für einzelne Ausreißer.</small>
          </article>
          <article className={styles.detailCard}>
            <span>Innerhalb einer Stunde</span>
            <strong>{analytics.response.withinOneHour}</strong>
            <small>Von {analytics.response.measurableLeads} messbaren Erstreaktionen.</small>
          </article>
          <article className={styles.detailCard}>
            <span>Innerhalb eines Tages</span>
            <strong>{analytics.response.withinOneDay}</strong>
            <small>Von {analytics.response.measurableLeads} messbaren Erstreaktionen.</small>
          </article>
        </div>
        <p className={styles.note}>
          Eine Erstreaktion gilt als messbar, sobald der Status einer Anfrage erstmals von
          „Neue Anfrage“ auf einen Bearbeitungs- oder Ergebnisstatus geändert wird. Anfragen
          ohne gespeicherten Statuswechsel werden nicht künstlich geschätzt.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="trend-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="trend-title">Entwicklung der letzten 30 Tage</h2>
            <p>Sechs Abschnitte mit jeweils fünf Tagen.</p>
          </div>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Zeitraum</th>
                <th>Anfragen</th>
                <th>Erfolgreich</th>
                <th>Nicht erfolgreich</th>
                <th>Offen</th>
              </tr>
            </thead>
            <tbody>
              {analytics.trend.map((bucket) => (
                <tr key={bucket.startAt}>
                  <th scope="row">{bucket.label}</th>
                  <td>{bucket.total}</td>
                  <td>{bucket.successful}</td>
                  <td>{bucket.unsuccessful}</td>
                  <td>{bucket.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.outcomeGrid} aria-label="Ergebnisverteilung">
        <article className={styles.section}>
          <h2>Erfolgreiche Ergebnisse</h2>
          <p>Konkreter Nutzen aus den erfolgreich abgeschlossenen Anfragen.</p>
          {analytics.successfulOutcomes.length === 0 ? (
            <p className={styles.emptyText}>Noch keine erfolgreichen Ergebnisse vorhanden.</p>
          ) : (
            <ul className={styles.outcomeList}>
              {analytics.successfulOutcomes.map((outcome) => (
                <li key={outcome.key}>
                  <span>{outcome.label}</span>
                  <strong>{outcome.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={styles.section}>
          <h2>Nicht erfolgreiche Gründe</h2>
          <p>Hilft dabei, wiederkehrende Ursachen zu erkennen.</p>
          {analytics.unsuccessfulOutcomes.length === 0 ? (
            <p className={styles.emptyText}>Noch keine nicht erfolgreichen Gründe vorhanden.</p>
          ) : (
            <ul className={styles.outcomeList}>
              {analytics.unsuccessfulOutcomes.map((outcome) => (
                <li key={outcome.key}>
                  <span>{outcome.label}</span>
                  <strong>{outcome.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className={styles.section} aria-labelledby="basis-title">
        <h2 id="basis-title">Berechnungsgrundlage</h2>
        <p>
          Alle Auswertungen beziehen sich auf nicht gelöschte Anfragen und werden nach dem
          Eingangszeitpunkt der Anfrage dem jeweiligen Zeitraum zugeordnet. Die Erfolgsquote
          vergleicht erfolgreiche mit allen bereits abgeschlossenen Anfragen. Geldwerte werden nur
          aus „Auftrag erhalten“ und den vom Kunden gepflegten Durchschnitts- und Kostenwerten
          berechnet.
        </p>
      </section>
    </main>
  );
}
