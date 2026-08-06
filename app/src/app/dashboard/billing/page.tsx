import Link from "next/link";

import { openBillingPortalAction, startBillingCheckoutAction } from "@/features/billing/actions";
import { getFormattedStripeMonthlyPriceForMarket } from "@/features/billing/pricing";
import LegalFooter from "@/shared/ui/LegalFooter";
import { BILLING_COPY } from "@/shared/i18n/dashboard";
import { getRequestMarket } from "@/shared/i18n/request";
import {
  BILLING_LOOKUP_KEY,
  BILLING_ROUTE,
  getCompanyBillingSnapshot,
  getPlannedCancellationDate,
  getBillingStatusLabel,
  isCancellationPlanned,
  requireUserCompanyAccess,
  syncOwnerCompanyBillingFromStripe,
} from "@/features/billing/service";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

type BillingPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
    billing?: string;
    canceled?: string;
  }>;
};

const panelStyle = {
  display: "grid",
  gap: 16,
  padding: 20,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
} as const;

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "2.75rem",
  width: "fit-content",
  padding: "12px 18px",
  borderRadius: 8,
  background: "#3182ce",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  background: "#fff",
  color: "#1a202c",
  border: "1px solid #cbd5e0",
} as const;

const checkboxRowStyle = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  lineHeight: 1.5,
  color: "#4b5563",
} as const;

const formatDateTimeByLocale = (value: string | null, locale: "de-DE" | "en-US") => {
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

const getCompanyName = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return "Varnito";
  }

  return data.name;
};

const getStatusText = (copy: (typeof BILLING_COPY)["de"], billingReason: string | null | undefined) => {
  if (!billingReason) {
    return copy.statusText.default;
  }

  return copy.statusText[billingReason] ?? copy.statusText.default;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const { market, config } = await getRequestMarket();
  const copy = BILLING_COPY[market];
  const pricing = await getFormattedStripeMonthlyPriceForMarket(market).catch(() => null);
  const access = await requireUserCompanyAccess({
    allowMember: true,
    nextPath: BILLING_ROUTE,
    enforceBilling: false,
  });

  const billing =
    access.isOwner && access.billing.stripeSubscriptionId
      ? (await syncOwnerCompanyBillingFromStripe({
          companyId: access.companyId,
          ownerUserId: access.userId,
        })) ?? (await getCompanyBillingSnapshot(access.companyId))
      : access.billing;
  const plannedCancellationDate = getPlannedCancellationDate(billing);
  const cancellationPlanned = isCancellationPlanned(billing);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const companyName = await getCompanyName(access.companyId);
  const subscriptionText = market === "us"
    ? `${pricing?.label ?? "USD / month"}. ${copy.subscriptionText}`
    : `${pricing?.label ?? "EUR / Monat"}. ${copy.subscriptionText}`;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto", display: "grid", gap: 20 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <Link href={billing.hasAppAccess ? "/dashboard" : "/dashboard/billing"} style={{ color: "#3182ce", fontWeight: 700, textDecoration: "none" }}>
          ← {copy.back}
        </Link>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>
          Billing
        </p>
        <h1 style={{ margin: 0 }}>{companyName}</h1>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>
          {getStatusText(copy, resolvedSearchParams?.billing ?? billing.lockReason)}
        </p>
      </header>

      {resolvedSearchParams?.success ? (
        <section style={{ padding: 16, border: "1px solid #b7f0c6", borderRadius: 10, background: "#e6ffed" }}>
          {copy.checkoutSuccess}
        </section>
      ) : null}

      {resolvedSearchParams?.canceled === "1" ? (
        <section style={{ padding: 16, border: "1px solid #f0e0b7", borderRadius: 10, background: "#fff8e6" }}>
          {copy.checkoutCanceled}
        </section>
      ) : null}

      {resolvedSearchParams?.error ? (
        <section style={{ padding: 16, border: "1px solid #f0b7b7", borderRadius: 10, background: "#ffe6e6" }}>
          {resolvedSearchParams.error}
        </section>
      ) : null}

      <section style={panelStyle}>
        <h2 style={{ margin: 0 }}>{copy.statusHeading}</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <div><strong>Produkt:</strong> Varnito Pro</div>
          <div><strong>Lookup Key:</strong> {BILLING_LOOKUP_KEY}</div>
          <div><strong>Status:</strong> {getBillingStatusLabel(billing.status)}</div>
          <div><strong>{market === "us" ? "Access:" : "Zugriff:"}</strong> {billing.hasAppAccess ? copy.statusAccessGranted : copy.statusAccessBlocked}</div>
          <div><strong>{copy.statusTrialUntil}:</strong> {formatDateTimeByLocale(billing.trialEndsAt, config.locale)}</div>
          <div><strong>{copy.statusCurrentPeriodUntil}:</strong> {formatDateTimeByLocale(billing.currentPeriodEnd, config.locale)}</div>
          <div><strong>{copy.statusCancellationPlanned}:</strong> {cancellationPlanned ? copy.yes : copy.no}</div>
          <div><strong>{copy.statusCancellationDate}:</strong> {formatDateTimeByLocale(plannedCancellationDate, config.locale)}</div>
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={{ margin: 0 }}>{copy.subscriptionHeading}</h2>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>
          {subscriptionText}
        </p>

        {access.isOwner ? (
          <div style={{ display: "grid", gap: 12 }}>
            <form action={startBillingCheckoutAction} style={{ display: "grid", gap: 12 }}>
              <label style={checkboxRowStyle}>
                <input name="legal_acceptance" type="checkbox" required style={{ marginTop: 4 }} />
                <span>
                  {copy.legalAcceptance}
                </span>
              </label>
              <button type="submit" style={primaryButtonStyle}>{copy.startSubscription}</button>
            </form>

            <form action={openBillingPortalAction}>
              <button
                type="submit"
                style={secondaryButtonStyle}
                disabled={!billing.stripeCustomerId}
              >
                {copy.manageSubscription}
              </button>
            </form>
          </div>
        ) : (
          <p style={{ margin: 0, color: "#555" }}>
            {copy.ownerOnly}
          </p>
        )}
      </section>

      <LegalFooter />
    </main>
  );
}