import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOperatorUser } from "@/features/operator/access";
import {
  getOperatorCompanyDetailData,
  type OperatorCompanyDetailData,
} from "@/features/operator/data";

import styles from "../../operator.module.css";

export const dynamic = "force-dynamic";

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Neue Anfrage",
  contacted: "Kontaktiert",
  qualified: "Qualifiziert",
  proposal: "Angebot",
  won: "Gewonnen",
  lost: "Verloren",
  archived: "Archiviert",
  successful: "Erfolgreich",
  unsuccessful: "Nicht erfolgreich",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Inhaber",
  admin: "Administrator",
  member: "Mitarbeiter",
};

const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  pending: "Wartend",
  processing: "In Bearbeitung",
  sent: "Gesendet",
  failed: "Fehlgeschlagen",
  cancelled: "Abgebrochen",
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  owner_new_lead: "Neue Anfrage an Inhaber",
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "—";
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

const formatValue = (value: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : "—";
};

const getSystemStatus = (data: OperatorCompanyDetailData) => {
  if (data.company.deletedAt) {
    return {
      label: "Deaktiviert",
      tone: "neutral",
      message: "Das Unternehmen ist deaktiviert.",
    } as const;
  }

  if (data.metrics.staleProcessingNotifications > 0) {
    return {
      label: "Kritisch",
      tone: "danger",
      message: "Mindestens eine Benachrichtigung hängt seit mehr als zehn Minuten fest.",
    } as const;
  }

  if (data.metrics.failedNotifications7d > 0 || data.metrics.dueNotifications > 0) {
    return {
      label: "Prüfen",
      tone: "warning",
      message: "Fehlgeschlagene oder fällige Benachrichtigungen benötigen Aufmerksamkeit.",
    } as const;
  }

  return {
    label: "In Ordnung",
    tone: "success",
    message: "Für dieses Unternehmen sind aktuell keine Queue-Probleme erkennbar.",
  } as const;
};

const getNotificationTone = (status: string) => {
  if (status === "failed") {
    return "danger";
  }

  if (status === "pending" || status === "processing") {
    return "warning";
  }

  if (status === "sent") {
    return "success";
  }

  return "neutral";
};

const getLeadName = (firstName: string | null, lastName: string | null) =>
  [firstName, lastName].filter(Boolean).join(" ") || "Unbekannter Kontakt";

type OperatorCompanyDetailPageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function OperatorCompanyDetailPage({
  params,
}: OperatorCompanyDetailPageProps) {
  const operator = await requireOperatorUser();
  const { companyId } = await params;
  const data = await getOperatorCompanyDetailData(companyId);

  if (!data) {
    notFound();
  }

  const systemStatus = getSystemStatus(data);
  const usersById = new Map(data.users.map((user) => [user.id, user]));
  const notificationDestination = data.company.notificationEmail ?? data.company.email;

  return (
    <main className={styles.shell}>
      <section className={styles.header} aria-labelledby="operator-company-title">
        <div>
          <Link className={styles.backLink} href="/operator">
            ← Zurück zur Systemübersicht
          </Link>
          <p className={styles.eyebrow}>Varnito Betreiberbereich</p>
          <h1 className={styles.detailTitle} id="operator-company-title">
            {data.company.name}
          </h1>
          <p className={styles.copy}>
            Nur lesbare Kundenansicht mit Stammdaten, Benutzern, Anfragen und
            Benachrichtigungszustand.
          </p>
          <p className={styles.operatorIdentity}>Angemeldet als {operator.email ?? operator.id}</p>
        </div>

        <span className={`${styles.badge} ${styles[systemStatus.tone]}`}>
          {systemStatus.label}
        </span>
      </section>

      <section className={styles.metrics} aria-label="Kundenkennzahlen">
        <article className={styles.metricCard}>
          <p>Benutzer</p>
          <strong>{data.metrics.userCount}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Leads insgesamt</p>
          <strong>{data.metrics.leadCount}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Leads letzte 30 Tage</p>
          <strong>{data.metrics.leadsLast30d}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Fehler letzte 7 Tage</p>
          <strong>{data.metrics.failedNotifications7d}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Fällige Queue-Einträge</p>
          <strong>{data.metrics.dueNotifications}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Festhängende Einträge</p>
          <strong>{data.metrics.staleProcessingNotifications}</strong>
        </article>
      </section>

      {systemStatus.tone === "danger" || systemStatus.tone === "warning" ? (
        <section className={styles.alert} role="alert">
          <strong>Systemzustand: {systemStatus.label}</strong>
          <p>{systemStatus.message}</p>
        </section>
      ) : null}

      <section className={styles.detailGrid} aria-label="Unternehmens- und Systemdaten">
        <article className={styles.detailCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Unternehmensdaten</h2>
              <p>Registrierte Stammdaten des Kunden.</p>
            </div>
          </div>

          <dl className={styles.definitionGrid}>
            <div>
              <dt>Ansprechpartner</dt>
              <dd>{formatValue(data.company.contactPerson)}</dd>
            </div>
            <div>
              <dt>E-Mail</dt>
              <dd>{formatValue(data.company.email)}</dd>
            </div>
            <div>
              <dt>Benachrichtigungsadresse</dt>
              <dd>{formatValue(notificationDestination)}</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd>{formatValue(data.company.phone)}</dd>
            </div>
            <div>
              <dt>Website</dt>
              <dd>{formatValue(data.company.websiteUrl)}</dd>
            </div>
            <div>
              <dt>Branche</dt>
              <dd>{formatValue(data.company.industry)}</dd>
            </div>
            <div>
              <dt>Zeitzone</dt>
              <dd>{formatValue(data.company.timezone)}</dd>
            </div>
            <div>
              <dt>Geschäftszeiten</dt>
              <dd>{formatValue(data.company.businessHours)}</dd>
            </div>
            <div>
              <dt>Erstellt</dt>
              <dd>{formatDateTime(data.company.createdAt)}</dd>
            </div>
            <div>
              <dt>Zuletzt geändert</dt>
              <dd>{formatDateTime(data.company.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className={styles.detailCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Abonnement und System</h2>
              <p>Aktueller Vertrags- und Benachrichtigungszustand.</p>
            </div>
          </div>

          <dl className={styles.definitionGrid}>
            <div>
              <dt>Systemstatus</dt>
              <dd>
                <span className={`${styles.badge} ${styles[systemStatus.tone]}`}>
                  {systemStatus.label}
                </span>
              </dd>
            </div>
            <div>
              <dt>Abo-Tarif</dt>
              <dd>{data.subscription?.plan ?? "Kein Abo"}</dd>
            </div>
            <div>
              <dt>Abo-Status</dt>
              <dd>{data.subscription?.status ?? "Nicht vorhanden"}</dd>
            </div>
            <div>
              <dt>Aktuelle Periode</dt>
              <dd>
                {data.subscription
                  ? `${formatDateTime(data.subscription.currentPeriodStart)} bis ${formatDateTime(
                      data.subscription.currentPeriodEnd,
                    )}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Kündigung vorgemerkt</dt>
              <dd>{data.subscription?.cancelAtPeriodEnd ? "Ja" : "Nein"}</dd>
            </div>
            <div>
              <dt>Letzter Lead</dt>
              <dd>{formatDateTime(data.metrics.lastLeadAt)}</dd>
            </div>
            <div>
              <dt>Letzte erfolgreiche Benachrichtigung</dt>
              <dd>{formatDateTime(data.metrics.lastSuccessfulNotificationAt)}</dd>
            </div>
            <div>
              <dt>Unternehmens-ID</dt>
              <dd className={styles.mono}>{data.company.id}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className={styles.companySection} aria-labelledby="company-users-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="company-users-title">Benutzer</h2>
            <p>Inhaber und zugeordnete Benutzer dieses Unternehmens.</p>
          </div>
          <span>{data.users.length} angezeigt</span>
        </div>

        {data.users.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>Keine Benutzer gefunden</h3>
            <p>Für dieses Unternehmen ist derzeit kein Benutzer zugeordnet.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Erstellt</th>
                  <th>Zuletzt geändert</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.fullName ?? "Ohne Namen"}</strong>
                      {user.isOwner ? <span className={styles.subtle}>Unternehmensinhaber</span> : null}
                    </td>
                    <td>{user.email}</td>
                    <td>{ROLE_LABELS[user.role] ?? user.role}</td>
                    <td>{formatDateTime(user.createdAt)}</td>
                    <td>{formatDateTime(user.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.companySection} aria-labelledby="company-leads-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="company-leads-title">Neueste Anfragen</h2>
            <p>Die letzten 25 nicht gelöschten Leads dieses Unternehmens.</p>
          </div>
          <span>{data.recentLeads.length} angezeigt</span>
        </div>

        {data.recentLeads.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>Noch keine Anfragen</h3>
            <p>Für dieses Unternehmen wurden noch keine Leads gespeichert.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Kontakt</th>
                  <th>Status</th>
                  <th>Priorität</th>
                  <th>Quelle</th>
                  <th>Zuständig</th>
                  <th>Erstellt</th>
                  <th>Aktualisiert</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLeads.map((lead) => {
                  const assignedUser = lead.assignedUserId
                    ? usersById.get(lead.assignedUserId)
                    : null;

                  return (
                    <tr key={lead.id}>
                      <td>
                        <strong>{getLeadName(lead.firstName, lead.lastName)}</strong>
                        <span className={styles.subtle}>
                          {lead.email ?? lead.phone ?? `ID ${lead.id.slice(0, 8)}`}
                        </span>
                      </td>
                      <td>{LEAD_STATUS_LABELS[lead.status] ?? lead.status}</td>
                      <td>{lead.priority}</td>
                      <td>{lead.source}</td>
                      <td>{assignedUser?.email ?? "Nicht zugewiesen"}</td>
                      <td>{formatDateTime(lead.createdAt)}</td>
                      <td>{formatDateTime(lead.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.companySection} aria-labelledby="company-notifications-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="company-notifications-title">Benachrichtigungs-Queue</h2>
            <p>Die letzten 50 Queue-Einträge, nur zur Diagnose.</p>
          </div>
          <span>{data.recentNotifications.length} angezeigt</span>
        </div>

        {data.recentNotifications.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>Keine Queue-Einträge</h3>
            <p>Für dieses Unternehmen wurden noch keine Benachrichtigungen eingeplant.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Typ</th>
                  <th>Versuche</th>
                  <th>Geplant</th>
                  <th>Letzter Versuch</th>
                  <th>Gesendet</th>
                  <th>Fehler</th>
                </tr>
              </thead>
              <tbody>
                {data.recentNotifications.map((notification) => (
                  <tr key={notification.id}>
                    <td>
                      <span
                        className={`${styles.badge} ${styles[getNotificationTone(notification.status)]}`}
                      >
                        {NOTIFICATION_STATUS_LABELS[notification.status] ?? notification.status}
                      </span>
                    </td>
                    <td>
                      <span>
                        {NOTIFICATION_TYPE_LABELS[notification.notificationType] ??
                          notification.notificationType}
                      </span>
                      <span className={styles.subtle}>Lead {notification.leadId.slice(0, 8)}</span>
                    </td>
                    <td>{notification.attemptCount}</td>
                    <td>{formatDateTime(notification.scheduledFor)}</td>
                    <td>{formatDateTime(notification.lastAttemptAt)}</td>
                    <td>{formatDateTime(notification.sentAt)}</td>
                    <td className={styles.errorCell}>{notification.errorMessage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
