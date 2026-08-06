import Link from "next/link";

import { openBillingPortalAction, startBillingCheckoutAction } from "@/features/billing/actions";
import LegalFooter from "@/shared/ui/LegalFooter";
import { BILLING_COPY } from "@/shared/i18n/dashboard";
import { getRequestMarket } from "@/shared/i18n/request";
import {
  BILLING_ROUTE,
  getCompanyBillingSnapshot,
  getPlannedCancellationDate,
  getBillingStatusLabel,
  isCancellationPlanned,
  requireUserCompanyAccess,
  syncOwnerCompanyBillingFromStripe,
} from "@/features/billing/service";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";
import styles from "./billing.module.css";

type BillingPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
    billing?: string;
    canceled?: string;
  }>;
};

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

const getCompanyName = async (companyId: string, market: "de" | "us") => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return market === "us" ? "Your company" : "Ihr Unternehmen";
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
  const companyName = await getCompanyName(access.companyId, market);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href={billing.hasAppAccess ? "/dashboard" : "/dashboard/billing"} className={styles.backLink}>
          ← {copy.back}
        </Link>
        <p className={styles.eyebrow}>
          Billing
        </p>
        <h1 className={styles.title}>{companyName}</h1>
        <p className={styles.copy}>
          {getStatusText(copy, resolvedSearchParams?.billing ?? billing.lockReason)}
        </p>
      </header>

      {resolvedSearchParams?.success ? (
        <section className={styles.notice}>
          {copy.checkoutSuccess}
        </section>
      ) : null}

      {resolvedSearchParams?.canceled === "1" ? (
        <section className={styles.noticeWarning}>
          {copy.checkoutCanceled}
        </section>
      ) : null}

      {resolvedSearchParams?.error ? (
        <section className={styles.noticeError}>
          {resolvedSearchParams.error}
        </section>
      ) : null}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>{copy.statusHeading}</h2>
        <div className={styles.statusGrid}>
          <div className={styles.statusRow}>
            <div className={styles.statusLabel}>Produkt</div>
            <div className={styles.statusValue}>Varnito Pro</div>
          </div>
          <div className={styles.statusRow}>
            <div className={styles.statusLabel}>Status</div>
            <div className={styles.statusValue}>{getBillingStatusLabel(billing.status)}</div>
          </div>
          <div className={styles.statusRow}>
            <div className={styles.statusLabel}>{market === "us" ? "Access" : "Zugriff"}</div>
            <div className={styles.statusValue}>{billing.hasAppAccess ? copy.statusAccessGranted : copy.statusAccessBlocked}</div>
          </div>
          <div className={styles.statusRow}>
            <div className={styles.statusLabel}>{copy.statusTrialUntil}</div>
            <div className={styles.statusValue}>{formatDateTimeByLocale(billing.trialEndsAt, config.locale)}</div>
          </div>
          <div className={styles.statusRow}>
            <div className={styles.statusLabel}>{copy.statusCurrentPeriodUntil}</div>
            <div className={styles.statusValue}>{formatDateTimeByLocale(billing.currentPeriodEnd, config.locale)}</div>
          </div>
          <div className={styles.statusRow}>
            <div className={styles.statusLabel}>{copy.statusCancellationPlanned}</div>
            <div className={styles.statusValue}>{cancellationPlanned ? copy.yes : copy.no}</div>
          </div>
          <div className={styles.statusRow}>
            <div className={styles.statusLabel}>{copy.statusCancellationDate}</div>
            <div className={styles.statusValue}>{formatDateTimeByLocale(plannedCancellationDate, config.locale)}</div>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>{copy.subscriptionHeading}</h2>
        <p className={styles.price}>{copy.subscriptionPrice}</p>
        <p className={styles.muted}>{copy.subscriptionTaxNote}</p>
        <p className={styles.muted}>
          {copy.subscriptionText}
        </p>

        {access.isOwner ? (
          <div className={styles.actions}>
            <form action={startBillingCheckoutAction} className={styles.form}>
              <label className={styles.checkboxRow}>
                <input name="legal_acceptance" type="checkbox" required />
                <span>
                  {copy.legalAcceptance}
                </span>
              </label>
              <button type="submit" className={styles.button}>{copy.startSubscription}</button>
            </form>

            <form action={openBillingPortalAction}>
              <button
                type="submit"
                className={styles.buttonSecondary}
                disabled={!billing.stripeCustomerId}
              >
                {copy.manageSubscription}
              </button>
            </form>
          </div>
        ) : (
          <p className={styles.muted}>
            {copy.ownerOnly}
          </p>
        )}
      </section>

      <LegalFooter />
    </main>
  );
}