import type { PartnerOwnerOverview, PartnerMeteringDashboardData } from "@/features/partners/operator-data";

import styles from "@/app/operator/owner/owner.module.css";

const formatMinorCurrency = (value: number | null, currency: string) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  return formatter.format(value);
};

const formatStatusText = (value: string, market: "de" | "us") => {
  const mapping: Record<string, string> = {
    pending: market === "us" ? "Pending" : "Ausstehend",
    active: market === "us" ? "Active" : "Aktiv",
    paused: market === "us" ? "Paused" : "Pausiert",
    terminated: market === "us" ? "Terminated" : "Beendet",
  };

  return mapping[value] ?? value;
};

const renderRevenueCell = (partner: PartnerOwnerOverview) => {
  if (partner.billingModel !== "per_customer" || partner.pricePerCustomerMinor === null) {
    return "—";
  }

  return formatMinorCurrency(partner.pricePerCustomerMinor, partner.currency);
};

const renderMeteringValue = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return value;
};

const renderSummaryCard = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <div key={label} className={styles.partnerSummaryCard}>
    <span className={styles.partnerSummaryLabel}>{label}</span>
    <strong className={styles.partnerSummaryValue}>{value}</strong>
  </div>
);

export function PartnerMeteringPanel({
  market,
  data,
}: {
  market: "de" | "us";
  data: PartnerMeteringDashboardData;
}) {
  if (!data.enabled) {
    return null;
  }

  const title = market === "us" ? "Partners / Integrations" : "Partner / Integrationen";
  const summaryLabel = market === "us" ? "Partner MRR" : "Partner-MRR";

  if (data.error) {
    return (
      <section className={styles.partnerMeteringSection} aria-label={title}>
        <div className={styles.partnerHeaderRow}>
          <div>
            <p className={styles.partnerEyebrow}>{market === "us" ? "Integrations" : "Integrationen"}</p>
            <h2 className={styles.partnerTitle}>{title}</h2>
          </div>
        </div>
        <div className={styles.partnerUnavailableState}>
          <strong>{market === "us" ? "Partner data is unavailable." : "Partnerdaten sind derzeit nicht verfügbar."}</strong>
          <span>{market === "us" ? "The partner panel is temporarily unavailable." : "Das Partner-Panel ist vorübergehend nicht verfügbar."}</span>
        </div>
      </section>
    );
  }

  if (data.partners.length === 0) {
    return (
      <section className={styles.partnerMeteringSection} aria-label={title}>
        <div className={styles.partnerHeaderRow}>
          <div>
            <p className={styles.partnerEyebrow}>{market === "us" ? "Integrations" : "Integrationen"}</p>
            <h2 className={styles.partnerTitle}>{title}</h2>
          </div>
        </div>
        <div className={styles.partnerEmptyState}>
          <strong>{market === "us" ? "No partners configured yet." : "Noch keine Partner eingerichtet."}</strong>
        </div>
      </section>
    );
  }

  const summaryCards = [
    { label: market === "us" ? "Active partners" : "Aktive Partner", value: data.summary.activePartners },
    { label: market === "us" ? "Active partner customers" : "Aktive Partnerkunden", value: data.summary.activeCustomers },
    { label: market === "us" ? "New this month" : "Neu diesen Monat", value: data.summary.newThisMonth },
    { label: market === "us" ? "Deactivated this month" : "Deaktiviert diesen Monat", value: data.summary.deactivatedThisMonth },
    { label: market === "us" ? "Net growth" : "Netto-Wachstum", value: data.summary.netChangeThisMonth },
    { label: market === "us" ? "Billable customers" : "Abrechenbare Kunden", value: data.summary.billableCustomers },
  ];

  const mrrRows = Object.entries(data.summary.mrrByCurrency ?? {}).sort(([left], [right]) => left.localeCompare(right));

  return (
    <section className={styles.partnerMeteringSection} aria-label={title}>
      <div className={styles.partnerHeaderRow}>
        <div>
          <p className={styles.partnerEyebrow}>{market === "us" ? "Integrations" : "Integrationen"}</p>
          <h2 className={styles.partnerTitle}>{title}</h2>
        </div>
      </div>

      <div className={styles.partnerSummaryGrid}>
        {summaryCards.map((card) => renderSummaryCard(card))}
      </div>

      {mrrRows.length > 0 && (
        <div className={styles.partnerMrrList}>
          {mrrRows.map(([currency, value]) => (
            <div key={currency} className={styles.partnerMrrItem}>
              <span>{currency} {summaryLabel}:</span>
              <strong>{formatMinorCurrency(value, currency)}</strong>
            </div>
          ))}
        </div>
      )}

      <div className={styles.partnerTableWrap}>
        <table className={styles.partnerTable}>
          <thead>
            <tr>
              <th>{market === "us" ? "Partner" : "Partner"}</th>
              <th>{market === "us" ? "Status" : "Status"}</th>
              <th>{market === "us" ? "Active" : "Aktiv"}</th>
              <th>{market === "us" ? "New" : "Neu"}</th>
              <th>{market === "us" ? "Reactivated" : "Reaktiviert"}</th>
              <th>{market === "us" ? "Deactivated" : "Deaktiviert"}</th>
              <th>{market === "us" ? "Net" : "Netto"}</th>
              <th>{market === "us" ? "Billable" : "Abrechenbar"}</th>
              <th>{market === "us" ? "Price / customer" : "Preis / Kunde"}</th>
              <th>MRR</th>
              <th>ARR</th>
            </tr>
          </thead>
          <tbody>
            {data.partners.map((partner) => (
              <tr key={partner.partnerId}>
                <td>
                  <div className={styles.partnerNameCell}>
                    <strong>{partner.name}</strong>
                    <span>{partner.partnerKey}</span>
                  </div>
                </td>
                <td>
                  <span className={styles.partnerStatusBadge}>{formatStatusText(partner.status, market)}</span>
                </td>
                <td>{renderMeteringValue(partner.activeCustomers)}</td>
                <td>{renderMeteringValue(partner.newThisMonth)}</td>
                <td>{renderMeteringValue(partner.reactivatedThisMonth)}</td>
                <td>{renderMeteringValue(partner.deactivatedThisMonth)}</td>
                <td>{renderMeteringValue(partner.netChangeThisMonth)}</td>
                <td>{renderMeteringValue(partner.billableCustomers)}</td>
                <td>{renderRevenueCell(partner)}</td>
                <td>{formatMinorCurrency(partner.mrrMinor, partner.currency)}</td>
                <td>{formatMinorCurrency(partner.arrMinor, partner.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
