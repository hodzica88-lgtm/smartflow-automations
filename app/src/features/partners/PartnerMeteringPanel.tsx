"use client";

import { useState } from "react";

import type { PartnerOwnerOverview, PartnerMeteringDashboardData } from "@/features/partners/operator-data";
import type { PartnerBillingModel, PartnerStatus } from "@/features/partners/types";

import styles from "@/app/operator/owner/owner.module.css";

type PartnerActionState = "idle" | "creating" | "saving" | "updating-status" | "issuing" | "revoking" | "rotating";

type PartnerCredentialRecord = {
  id: string;
  key_id: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  status: "active" | "revoked";
};

type PartnerCreateDraft = {
  name: string;
  partner_key: string;
  billing_model: PartnerBillingModel;
  price_per_customer_minor: string;
  currency: string;
};

export type RecentPartnerSecret = {
  partnerId: string;
  credential: string;
  kind: "issue" | "rotate";
};

export const closePartnerManagementContext = () => ({
  selectedPartnerId: null as string | null,
  recentSecret: null as RecentPartnerSecret | null,
});

export const clearRecentPartnerSecret = (secret: RecentPartnerSecret | null) => {
  void secret;
  return null;
};

export const getPartnerDetailTransition = ({
  nextPartnerId,
  currentSecret,
  preserveSecret = false,
}: {
  nextPartnerId: string;
  currentSecret: RecentPartnerSecret | null;
  preserveSecret?: boolean;
}) => ({
  selectedPartnerId: nextPartnerId,
  recentSecret: preserveSecret ? currentSecret : null,
});

const EMPTY_DRAFT: PartnerCreateDraft = {
  name: "",
  partner_key: "",
  billing_model: "per_customer",
  price_per_customer_minor: "",
  currency: "EUR",
};

const BILLING_MODELS: PartnerBillingModel[] = ["per_customer", "flat", "tiered", "custom"];

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

export const getAllowedStatusTransitions = (status: PartnerStatus): PartnerStatus[] => {
  const allowed: Record<PartnerStatus, PartnerStatus[]> = {
    pending: ["active", "paused", "terminated"],
    active: ["paused", "terminated"],
    paused: ["active", "terminated"],
    terminated: [],
  };

  return allowed[status] ?? [];
};

export const convertPriceInputToMinor = (value: string | null | undefined) => {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized || normalized === "null") {
    return null;
  }

  const numericValue = Number(normalized.replace(",", "."));

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 100);
};

const toIsoDate = (value: string | null) => {
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

const parsePartnerApiResponse = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const createPartnerRecordFromServer = (partner: Record<string, unknown>): PartnerOwnerOverview => ({
  partnerId: String(partner.id ?? ""),
  partnerKey: String(partner.partner_key ?? ""),
  name: String(partner.name ?? ""),
  status: (partner.status as PartnerStatus) ?? "pending",
  billingModel: (partner.billing_model as PartnerBillingModel) ?? "per_customer",
  currency: String(partner.currency ?? "EUR"),
  pricePerCustomerMinor: partner.price_per_customer_minor == null ? null : Number(partner.price_per_customer_minor),
  activeCustomers: Number(partner.active_customers ?? 0),
  billableCustomers: Number(partner.billable_customers ?? 0),
  newThisMonth: Number(partner.new_this_month ?? 0),
  reactivatedThisMonth: Number(partner.reactivated_this_month ?? 0),
  deactivatedThisMonth: Number(partner.deactivated_this_month ?? 0),
  netChangeThisMonth: Number(partner.net_change_this_month ?? 0),
  mrrMinor: partner.mrr_minor == null ? null : Number(partner.mrr_minor),
  arrMinor: partner.arr_minor == null ? null : Number(partner.arr_minor),
});

export function PartnerMeteringPanel({
  market,
  data,
  primaryOwner = false,
  partnerApiEnabled = false,
}: {
  market: "de" | "us";
  data: PartnerMeteringDashboardData;
  primaryOwner?: boolean;
  partnerApiEnabled?: boolean;
}) {
  const [localPartners, setLocalPartners] = useState<PartnerOwnerOverview[]>(data.partners);
  const [creationOpen, setCreationOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<PartnerCreateDraft>(EMPTY_DRAFT);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createAction, setCreateAction] = useState<PartnerActionState>("idle");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [credentialsByPartner, setCredentialsByPartner] = useState<Record<string, PartnerCredentialRecord[]>>({});
  const [credentialLoading, setCredentialLoading] = useState<Record<string, boolean>>({});
  const [recentSecret, setRecentSecret] = useState<{ partnerId: string; credential: string; kind: "issue" | "rotate" } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);

  const clearRecentSecret = () => setRecentSecret(null);
  const closePartnerManagement = () => {
    const cleared = closePartnerManagementContext();
    setSelectedPartnerId(cleared.selectedPartnerId);
    setRecentSecret(cleared.recentSecret);
  };

  const canManagePartners = Boolean(primaryOwner && data.enabled);
  const title = market === "us" ? "Partners / Integrations" : "Partner / Integrationen";
  const summaryLabel = market === "us" ? "Partner MRR" : "Partner-MRR";
  const selectedPartner = localPartners.find((partner) => partner.partnerId === selectedPartnerId) ?? null;

  const updatePartnerInState = (partnerId: string, nextPartner: Partial<PartnerOwnerOverview>) => {
    setLocalPartners((current) => current.map((partner) => (partner.partnerId === partnerId ? { ...partner, ...nextPartner } : partner)));
  };

  const openPartnerDetail = async (partner: PartnerOwnerOverview, preserveSecret = false) => {
    if (!preserveSecret) {
      clearRecentSecret();
    }

    setSelectedPartnerId(partner.partnerId);
    setDetailError(null);

    if (credentialLoading[partner.partnerId]) {
      return;
    }

    setCredentialLoading((current) => ({ ...current, [partner.partnerId]: true }));

    try {
      const response = await fetch(`/api/operator/partners/${partner.partnerId}/credentials`, {
        method: "GET",
      });
      const payload = await parsePartnerApiResponse(response);

      if (!response.ok || !payload || typeof payload !== "object") {
        setCredentialsByPartner((current) => ({ ...current, [partner.partnerId]: [] }));
        return;
      }

      const credentials = Array.isArray(payload.credentials)
        ? payload.credentials.map((entry: Record<string, unknown>) => ({
            id: String(entry.id ?? ""),
            key_id: String(entry.key_id ?? ""),
            created_at: String(entry.created_at ?? ""),
            last_used_at: typeof entry.last_used_at === "string" ? entry.last_used_at : null,
            revoked_at: typeof entry.revoked_at === "string" ? entry.revoked_at : null,
            status: entry.revoked_at ? "revoked" : "active",
          }))
        : [];

      setCredentialsByPartner((current) => ({ ...current, [partner.partnerId]: credentials }));
    } catch {
      setCredentialsByPartner((current) => ({ ...current, [partner.partnerId]: [] }));
    } finally {
      setCredentialLoading((current) => ({ ...current, [partner.partnerId]: false }));
    }
  };

  const handleCreatePartner = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    setCreateAction("creating");

    const priceMinor = convertPriceInputToMinor(createDraft.price_per_customer_minor);
    const trimmedName = createDraft.name.trim();
    const trimmedKey = createDraft.partner_key.trim();
    const trimmedCurrency = createDraft.currency.trim().toUpperCase();

    if (!trimmedName || !trimmedKey || !trimmedCurrency) {
      setCreateError(market === "us" ? "Please complete all required fields." : "Bitte fülle alle Pflichtfelder aus.");
      setCreateAction("idle");
      return;
    }

    if (!/^[a-z0-9][a-z0-9_-]*$/.test(trimmedKey)) {
      setCreateError(market === "us" ? "Partner key contains unsupported characters." : "Der Partner-Key enthält ungültige Zeichen.");
      setCreateAction("idle");
      return;
    }

    if (trimmedCurrency.length !== 3 || !/^[A-Z]{3}$/.test(trimmedCurrency)) {
      setCreateError(market === "us" ? "Currency must be a valid ISO code." : "Die Währung muss ein gültiger ISO-Code sein.");
      setCreateAction("idle");
      return;
    }

    try {
      const response = await fetch("/api/operator/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          partner_key: trimmedKey,
          billing_model: createDraft.billing_model,
          price_per_customer_minor: priceMinor,
          currency: trimmedCurrency,
        }),
      });

      const payload = await parsePartnerApiResponse(response);
      const errorKey = typeof payload?.error === "string" ? payload.error : "";

      if (!response.ok) {
        if (errorKey.includes("partner_key_conflict") || errorKey === "duplicate" || errorKey.includes("key_conflict")) {
          setCreateError(market === "us" ? "This partner key is already in use." : "Dieser Partner-Key wird bereits verwendet.");
        } else {
          setCreateError(market === "us" ? "Partner could not be saved." : "Partner konnte nicht gespeichert werden.");
        }
        setCreateAction("idle");
        return;
      }

      const createdPartner = payload?.partner as Record<string, unknown> | undefined;
      if (createdPartner) {
        const normalizedPartner = createPartnerRecordFromServer(createdPartner);
        clearRecentSecret();
        setLocalPartners((current) => [normalizedPartner, ...current]);
        setSelectedPartnerId(normalizedPartner.partnerId);
        setCreationOpen(false);
        setCreateDraft(EMPTY_DRAFT);
      }
    } catch {
      setCreateError(market === "us" ? "Partner could not be saved." : "Partner konnte nicht gespeichert werden.");
    } finally {
      setCreateAction("idle");
    }
  };

  const handleStatusChange = async (partnerId: string, nextStatus: PartnerStatus) => {
    if (nextStatus === "terminated") {
      const message = market === "us"
        ? "This partner will be permanently terminated. All active credentials are revoked immediately and the action cannot be reversed through normal management. Continue?"
        : "Dieser Partner wird permanent beendet. Alle aktuell aktiven Zugangsdaten werden sofort widerrufen. Diese Aktion kann über das normale Management nicht rückgängig gemacht werden. Fortfahren?";

      if (!window.confirm(message)) {
        return;
      }
    }

    try {
      const response = await fetch(`/api/operator/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await parsePartnerApiResponse(response);

      if (!response.ok) {
        setDetailError(market === "us" ? "The status update could not be saved." : "Der Status konnte nicht gespeichert werden.");
        return;
      }

      const updatedPartner = payload?.partner as Record<string, unknown> | undefined;
      if (updatedPartner) {
        updatePartnerInState(partnerId, { status: (updatedPartner.status as PartnerStatus) ?? nextStatus });
      } else {
        updatePartnerInState(partnerId, { status: nextStatus });
      }
    } catch {
      setDetailError(market === "us" ? "The status update could not be saved." : "Der Status konnte nicht gespeichert werden.");
    }
  };

  const handleDetailSave = async (partnerId: string, draft: { billing_model: PartnerBillingModel; price_per_customer_minor: string; currency: string }) => {
    setDetailSaving(true);
    setDetailError(null);

    const humanPrice = convertPriceInputToMinor(draft.price_per_customer_minor);
    const payload: Record<string, unknown> = {
      billing_model: draft.billing_model,
      price_per_customer_minor: humanPrice,
      currency: draft.currency.trim().toUpperCase(),
    };

    try {
      const response = await fetch(`/api/operator/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseBody = await parsePartnerApiResponse(response);

      if (!response.ok) {
        setDetailError(market === "us" ? "Partner could not be saved." : "Partner konnte nicht gespeichert werden.");
        return;
      }

      const partner = responseBody?.partner as Record<string, unknown> | undefined;
      if (partner) {
        const refreshed = createPartnerRecordFromServer(partner);
        updatePartnerInState(partnerId, {
          billingModel: refreshed.billingModel,
          pricePerCustomerMinor: refreshed.pricePerCustomerMinor,
          currency: refreshed.currency,
        });
      }
    } catch {
      setDetailError(market === "us" ? "Partner could not be saved." : "Partner konnte nicht gespeichert werden.");
    } finally {
      setDetailSaving(false);
    }
  };

  const handleIssueCredential = async (partnerId: string) => {
    try {
      const response = await fetch(`/api/operator/partners/${partnerId}/credentials`, { method: "POST" });
      const payload = await parsePartnerApiResponse(response);
      const credential = typeof payload?.credential === "string" ? payload.credential : "";

      if (!response.ok || !credential) {
        setDetailError(market === "us" ? "The API credential could not be created." : "Die API-Zugangsdaten konnten nicht erstellt werden.");
        return;
      }

      clearRecentSecret();
      setRecentSecret({ partnerId, credential, kind: "issue" });
      const partner = localPartners.find((entry) => entry.partnerId === partnerId) ?? selectedPartner;
      if (partner) {
        await openPartnerDetail(partner, true);
      }
    } catch {
      setDetailError(market === "us" ? "The API credential could not be created." : "Die API-Zugangsdaten konnten nicht erstellt werden.");
    }
  };

  const handleRevokeCredential = async (partnerId: string, credentialId: string) => {
    const message = market === "us"
      ? "This API key can no longer be used immediately afterwards. Continue?"
      : "Dieser API-Schlüssel kann danach sofort nicht mehr verwendet werden. Fortfahren?";

    if (!window.confirm(message)) {
      return;
    }

    try {
      const response = await fetch(`/api/operator/partners/${partnerId}/credentials/${credentialId}/revoke`, { method: "POST" });
      if (!response.ok) {
        setDetailError(market === "us" ? "The credential could not be revoked." : "Der Schlüssel konnte nicht widerrufen werden.");
        return;
      }

      setCredentialsByPartner((current) => ({
        ...current,
        [partnerId]: (current[partnerId] ?? []).map((credential) => credential.id === credentialId ? { ...credential, status: "revoked", revoked_at: new Date().toISOString() } : credential),
      }));
    } catch {
      setDetailError(market === "us" ? "The credential could not be revoked." : "Der Schlüssel konnte nicht widerrufen werden.");
    }
  };

  const handleRotateCredential = async (partnerId: string, credentialId: string) => {
    const message = market === "us"
      ? "The old credential becomes invalid immediately, the new credential is shown only once, and the old integration must be updated. Continue?"
      : "Der alte Schlüssel wird sofort ungültig, der neue Schlüssel wird nur einmal angezeigt und die bestehende Integration muss aktualisiert werden. Fortfahren?";

    if (!window.confirm(message)) {
      return;
    }

    try {
      const response = await fetch(`/api/operator/partners/${partnerId}/credentials/${credentialId}/rotate`, { method: "POST" });
      const payload = await parsePartnerApiResponse(response);
      const credential = typeof payload?.credential === "string" ? payload.credential : "";

      if (!response.ok || !credential) {
        setDetailError(market === "us" ? "The credential could not be rotated." : "Der Schlüssel konnte nicht rotiert werden.");
        return;
      }

      clearRecentSecret();
      setRecentSecret({ partnerId, credential, kind: "rotate" });
      const partner = localPartners.find((entry) => entry.partnerId === partnerId) ?? selectedPartner;
      if (partner) {
        await openPartnerDetail(partner, true);
      }
    } catch {
      setDetailError(market === "us" ? "The credential could not be rotated." : "Der Schlüssel konnte nicht rotiert werden.");
    }
  };

  const copySecret = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(market === "us" ? "Copied" : "Kopiert");
      window.setTimeout(() => setCopyFeedback(null), 1200);
    } catch {
      setDetailError(market === "us" ? "Clipboard access failed." : "Kopieren fehlgeschlagen.");
    }
  };

  const summaryCards = [
    { label: market === "us" ? "Active partners" : "Aktive Partner", value: data.summary.activePartners },
    { label: market === "us" ? "Active partner customers" : "Aktive Partnerkunden", value: data.summary.activeCustomers },
    { label: market === "us" ? "New this month" : "Neu diesen Monat", value: data.summary.newThisMonth },
    { label: market === "us" ? "Deactivated this month" : "Deaktiviert diesen Monat", value: data.summary.deactivatedThisMonth },
    { label: market === "us" ? "Net growth" : "Netto-Wachstum", value: data.summary.netChangeThisMonth },
    { label: market === "us" ? "Billable customers" : "Abrechenbare Kunden", value: data.summary.billableCustomers },
  ];

  const mrrRows = Object.entries(data.summary.mrrByCurrency ?? {}).sort(([left], [right]) => left.localeCompare(right));

  if (!data.enabled) {
    return null;
  }

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

  const selectedPartnerCredentials = selectedPartner ? credentialsByPartner[selectedPartner.partnerId] ?? [] : [];

  return (
    <section className={styles.partnerMeteringSection} aria-label={title}>
      <div className={styles.partnerHeaderRow}>
        <div>
          <p className={styles.partnerEyebrow}>{market === "us" ? "Integrations" : "Integrationen"}</p>
          <h2 className={styles.partnerTitle}>{title}</h2>
        </div>
      </div>

      <div className={styles.partnerApiStatusRow}>
        <span>{market === "us" ? "External Partner API" : "External Partner API"}</span>
        <span className={partnerApiEnabled ? styles.partnerApiBadgeActive : styles.partnerApiBadgeInactive}>
          {partnerApiEnabled ? (market === "us" ? "Aktiv" : "Aktiv") : (market === "us" ? "Deaktiviert" : "Deaktiviert")}
        </span>
      </div>

      {canManagePartners && (
        <div className={styles.partnerToolbar}>
          <button type="button" className={styles.partnerPrimaryButton} onClick={() => setCreationOpen(true)}>
            {market === "us" ? "+ Add partner" : "+ Partner hinzufügen"}
          </button>
        </div>
      )}

      {creationOpen && canManagePartners && (
        <div className={styles.partnerDialogBackdrop}>
          <div className={styles.partnerDialog}>
            <div className={styles.partnerDialogHeader}>
              <h3>{market === "us" ? "Add partner" : "Partner hinzufügen"}</h3>
              <button type="button" className={styles.partnerSecondaryButton} onClick={() => setCreationOpen(false)}>
                {market === "us" ? "Close" : "Schließen"}
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className={styles.partnerFormGrid}>
              <label className={styles.partnerField}>
                <span>{market === "us" ? "Partner name" : "Partnername"}</span>
                <input value={createDraft.name} onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))} required />
              </label>

              <label className={styles.partnerField}>
                <span>{market === "us" ? "Partner key" : "Partner-Key"}</span>
                <input value={createDraft.partner_key} onChange={(event) => setCreateDraft((current) => ({ ...current, partner_key: event.target.value }))} required />
              </label>

              <label className={styles.partnerField}>
                <span>{market === "us" ? "Billing model" : "Abrechnungsmodell"}</span>
                <select value={createDraft.billing_model} onChange={(event) => setCreateDraft((current) => ({ ...current, billing_model: event.target.value as PartnerBillingModel }))}>
                  {BILLING_MODELS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className={styles.partnerField}>
                <span>{market === "us" ? "Price per customer" : "Preis pro Kunde"}</span>
                <input value={createDraft.price_per_customer_minor} onChange={(event) => setCreateDraft((current) => ({ ...current, price_per_customer_minor: event.target.value }))} placeholder="3.00" />
              </label>

              <label className={styles.partnerField}>
                <span>{market === "us" ? "Currency" : "Währung"}</span>
                <input value={createDraft.currency} onChange={(event) => setCreateDraft((current) => ({ ...current, currency: event.target.value }))} maxLength={3} />
              </label>

              <div className={styles.partnerFieldMeta}>
                <span>{market === "us" ? "Status: pending" : "Status: ausstehend"}</span>
              </div>

              {createError && <p className={styles.partnerInlineError}>{createError}</p>}

              <div className={styles.partnerDialogActions}>
                <button type="submit" className={styles.partnerPrimaryButton} disabled={createAction === "creating"}>
                  {createAction === "creating" ? (market === "us" ? "Saving…" : "Speichern…") : (market === "us" ? "Create partner" : "Partner anlegen")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {localPartners.length === 0 ? (
        <div className={styles.partnerEmptyState}>
          <strong>{market === "us" ? "No partners configured yet." : "Noch keine Partner eingerichtet."}</strong>
        </div>
      ) : (
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
                <th>{market === "us" ? "Actions" : "Aktionen"}</th>
              </tr>
            </thead>
            <tbody>
              {localPartners.map((partner) => (
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
                  <td>
                    {canManagePartners ? (
                      <button type="button" className={styles.partnerSecondaryButton} onClick={() => openPartnerDetail(partner)}>
                        {market === "us" ? "Manage" : "Verwalten"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPartner && canManagePartners && (
        <div className={styles.partnerDetailPanel}>
          <div className={styles.partnerDetailHeader}>
            <div>
              <p className={styles.partnerEyebrow}>{market === "us" ? "Partner management" : "Partner-Verwaltung"}</p>
              <h3 className={styles.partnerTitle}>{selectedPartner.name}</h3>
            </div>
            <button type="button" className={styles.partnerSecondaryButton} onClick={closePartnerManagement}>
              {market === "us" ? "Close" : "Schließen"}
            </button>
          </div>

          <div className={styles.partnerDetailGrid}>
            <div className={styles.partnerMetaCard}>
              <span>{market === "us" ? "Partner key" : "Partner-Key"}</span>
              <strong>{selectedPartner.partnerKey}</strong>
            </div>
            <div className={styles.partnerMetaCard}>
              <span>{market === "us" ? "Status" : "Status"}</span>
              <strong>{formatStatusText(selectedPartner.status, market)}</strong>
            </div>
            <div className={styles.partnerMetaCard}>
              <span>{market === "us" ? "Billing model" : "Abrechnungsmodell"}</span>
              <strong>{selectedPartner.billingModel}</strong>
            </div>
            <div className={styles.partnerMetaCard}>
              <span>{market === "us" ? "Price/customer" : "Preis / Kunde"}</span>
              <strong>{renderRevenueCell(selectedPartner) === "—" ? "—" : `${renderRevenueCell(selectedPartner)}`}</strong>
            </div>
            <div className={styles.partnerMetaCard}>
              <span>{market === "us" ? "Currency" : "Währung"}</span>
              <strong>{selectedPartner.currency}</strong>
            </div>
            <div className={styles.partnerMetaCard}>
              <span>{market === "us" ? "Active customers" : "Aktive Kunden"}</span>
              <strong>{selectedPartner.activeCustomers}</strong>
            </div>
            <div className={styles.partnerMetaCard}>
              <span>{market === "us" ? "Billable customers" : "Abrechenbar"}</span>
              <strong>{selectedPartner.billableCustomers}</strong>
            </div>
            <div className={styles.partnerMetaCard}>
              <span>MRR</span>
              <strong>{formatMinorCurrency(selectedPartner.mrrMinor, selectedPartner.currency)}</strong>
            </div>
            <div className={styles.partnerMetaCard}>
              <span>ARR</span>
              <strong>{formatMinorCurrency(selectedPartner.arrMinor, selectedPartner.currency)}</strong>
            </div>
          </div>

          <div className={styles.partnerActionGroup}>
            {getAllowedStatusTransitions(selectedPartner.status).map((status) => (
              <button key={status} type="button" className={styles.partnerSecondaryButton} onClick={() => handleStatusChange(selectedPartner.partnerId, status)}>
                {status === "active" ? (market === "us" ? "Activate" : "Aktivieren") : status === "paused" ? (market === "us" ? "Pause" : "Pausieren") : (market === "us" ? "Terminate" : "Beenden")}
              </button>
            ))}
          </div>

          <div className={styles.partnerFormGrid}>
            <label className={styles.partnerField}>
              <span>{market === "us" ? "Billing model" : "Abrechnungsmodell"}</span>
              <select value={selectedPartner.billingModel} onChange={(event) => updatePartnerInState(selectedPartner.partnerId, { billingModel: event.target.value as PartnerBillingModel })}>
                {BILLING_MODELS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className={styles.partnerField}>
              <span>{market === "us" ? "Price per customer" : "Preis pro Kunde"}</span>
              <input value={selectedPartner.pricePerCustomerMinor === null ? "" : String(selectedPartner.pricePerCustomerMinor / 100)} onChange={(event) => {
                const nextValue = event.target.value;
                updatePartnerInState(selectedPartner.partnerId, { pricePerCustomerMinor: convertPriceInputToMinor(nextValue) });
              }} placeholder="3.00" />
            </label>

            <label className={styles.partnerField}>
              <span>{market === "us" ? "Currency" : "Währung"}</span>
              <input value={selectedPartner.currency} onChange={(event) => updatePartnerInState(selectedPartner.partnerId, { currency: event.target.value.toUpperCase() })} maxLength={3} />
            </label>

            <button type="button" className={styles.partnerPrimaryButton} disabled={detailSaving} onClick={() => handleDetailSave(selectedPartner.partnerId, {
              billing_model: selectedPartner.billingModel,
              price_per_customer_minor: selectedPartner.pricePerCustomerMinor === null ? "" : (selectedPartner.pricePerCustomerMinor / 100).toFixed(2),
              currency: selectedPartner.currency,
            })}>
              {detailSaving ? (market === "us" ? "Saving…" : "Speichern…") : (market === "us" ? "Save changes" : "Änderungen speichern")}
            </button>
          </div>

          {detailError && <p className={styles.partnerInlineError}>{detailError}</p>}

          <div className={styles.partnerCredentialSection}>
            <div className={styles.partnerCredentialHeader}>
              <h4>{market === "us" ? "API credentials" : "API Credentials"}</h4>
              {selectedPartner.status === "active" && (
                <button type="button" className={styles.partnerPrimaryButton} onClick={() => handleIssueCredential(selectedPartner.partnerId)}>
                  {market === "us" ? "Create new API credentials" : "Neue API-Zugangsdaten erstellen"}
                </button>
              )}
            </div>

            {selectedPartner.status !== "active" && (
              <p className={styles.partnerMutedText}>{market === "us" ? "Credential issuance is only available for active partners." : "Die Ausgabe von Zugangsdaten ist nur für aktive Partner möglich."}</p>
            )}

            {recentSecret && recentSecret.partnerId === selectedPartner.partnerId && (
              <div className={styles.partnerSecretPanel}>
                <div className={styles.partnerSecretHeader}>
                  <strong>{market === "us" ? "New partner access credentials" : "Neue Partner-Zugangsdaten"}</strong>
                  <button type="button" className={styles.partnerSecondaryButton} onClick={clearRecentSecret}>
                    {market === "us" ? "Close" : "Schließen"}
                  </button>
                </div>
                <code className={styles.partnerSecretValue}>{recentSecret.credential}</code>
                <div className={styles.partnerSecretActions}>
                  <button type="button" className={styles.partnerPrimaryButton} onClick={() => copySecret(recentSecret.credential)}>
                    {market === "us" ? "Copy" : "Kopieren"}
                  </button>
                  {copyFeedback && <span className={styles.partnerCopyFeedback}>{copyFeedback}</span>}
                </div>
                <p className={styles.partnerSecretHint}>{market === "us" ? "This key is only shown once. After closing, it cannot be displayed again." : "Dieser Schlüssel wird nur einmal angezeigt. Nach dem Schließen kann er nicht erneut angezeigt werden."}</p>
              </div>
            )}

            {credentialLoading[selectedPartner.partnerId] ? (
              <p className={styles.partnerMutedText}>{market === "us" ? "Loading credentials…" : "Zugänge werden geladen…"}</p>
            ) : selectedPartnerCredentials.length === 0 ? (
              <p className={styles.partnerMutedText}>{market === "us" ? "No API credentials created yet." : "Noch keine API-Zugangsdaten erstellt."}</p>
            ) : (
              <div className={styles.partnerCredentialTable}>
                <div className={styles.partnerCredentialTableHeader}>
                  <span>{market === "us" ? "Key ID" : "Key ID"}</span>
                  <span>{market === "us" ? "Created" : "Erstellt"}</span>
                  <span>{market === "us" ? "Last used" : "Zuletzt genutzt"}</span>
                  <span>{market === "us" ? "Status" : "Status"}</span>
                  <span>{market === "us" ? "Actions" : "Aktionen"}</span>
                </div>

                {selectedPartnerCredentials.map((credential) => (
                  <div key={credential.id} className={styles.partnerCredentialRow}>
                    <span>{credential.key_id}</span>
                    <span>{toIsoDate(credential.created_at)}</span>
                    <span>{toIsoDate(credential.last_used_at)}</span>
                    <span>{credential.status === "revoked" ? (market === "us" ? "Revoked" : "Widerrufen") : (market === "us" ? "Active" : "Aktiv")}</span>
                    <div className={styles.partnerCredentialActions}>
                      {credential.status === "active" ? (
                        <>
                          <button type="button" className={styles.partnerSecondaryButton} onClick={() => handleRevokeCredential(selectedPartner.partnerId, credential.id)}>
                            {market === "us" ? "Revoke" : "Widerrufen"}
                          </button>
                          <button type="button" className={styles.partnerSecondaryButton} onClick={() => handleRotateCredential(selectedPartner.partnerId, credential.id)}>
                            {market === "us" ? "Rotate" : "Rotieren"}
                          </button>
                        </>
                      ) : (
                        <span className={styles.partnerMutedText}>{credential.revoked_at ? toIsoDate(credential.revoked_at) : (market === "us" ? "Revoked" : "Widerrufen")}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
