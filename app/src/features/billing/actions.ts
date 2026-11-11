"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";

import {
  BILLING_LOOKUP_KEY,
  BILLING_ROUTE,
  BILLING_TRIAL_DAYS,
  requireUserCompanyAccess,
  getCompanyBillingSnapshot,
} from "@/features/billing/service";
import { getStripeMonthlyPriceForMarket } from "@/features/billing/pricing";
import { trackAnalyticsEvent } from "@/features/analytics/events";
import { acceptBillingLegalTerms } from "@/features/legal/billing";
import { publicEnv } from "@/shared/config/env";
import { type MarketCode } from "@/shared/i18n/market";
import { getRequestMarket } from "@/shared/i18n/request";
import { enforceActionRateLimit } from "@/shared/lib/rate-limit/service";
import { createStripeServerClient } from "@/shared/lib/stripe/server";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

const redirectBillingError = (message: string): never => {
  redirect(`${BILLING_ROUTE}?error=${encodeURIComponent(message)}`);
};

type CheckoutBilling = Awaited<ReturnType<typeof getCompanyBillingSnapshot>>;
type CheckoutTrial = { kind: "none" } | { kind: "days"; days: number } | { kind: "until"; unix: number };

// Stripe requires trial_end to be at least 48 hours in the future.
const MIN_TRIAL_END_LEAD_MS = 48 * 60 * 60 * 1000 + 10 * 60 * 1000;
const LIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "paused"]);

const hasLiveSubscription = (billing: CheckoutBilling) => {
  if (!billing.stripeSubscriptionId) {
    return false;
  }

  if (LIVE_SUBSCRIPTION_STATUSES.has(billing.status)) {
    return true;
  }

  return billing.status === "canceled" && billing.hasAppAccess;
};

const resolveCheckoutTrial = (billing: CheckoutBilling, now: Date): CheckoutTrial => {
  if (billing.trialUsedAt || billing.stripeSubscriptionId || billing.status === "active") {
    return { kind: "none" };
  }

  // Legacy company with a still-running local trial: keep its end date, never extend it.
  if (billing.trialStartedAt) {
    const trialEndsAtMs = billing.trialEndsAt ? Date.parse(billing.trialEndsAt) : Number.NaN;

    if (
      billing.status === "trialing" &&
      Number.isFinite(trialEndsAtMs) &&
      trialEndsAtMs - now.getTime() >= MIN_TRIAL_END_LEAD_MS
    ) {
      return { kind: "until", unix: Math.floor(trialEndsAtMs / 1000) };
    }

    return { kind: "none" };
  }

  return { kind: "days", days: BILLING_TRIAL_DAYS };
};

const hasLiveStripeSubscription = async (stripe: Stripe, customerId: string | null) => {
  if (!customerId) {
    return false;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  return subscriptions.data.some((subscription) =>
    LIVE_SUBSCRIPTION_STATUSES.has(subscription.status),
  );
};

const getCompanyForBilling = async (companyId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, email")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Die Firma konnte nicht geladen werden.");
  }

  return data;
};

export async function startBillingCheckoutAction(formData: FormData) {
  let market: MarketCode = "de";
  let siteUrl = publicEnv.appUrl;

  try {
    const requestMarket = await getRequestMarket();
    market = requestMarket.market;
    siteUrl = requestMarket.config.siteUrl;
  } catch {
    // Fall back to existing environment URL outside request scope.
  }

  const access = await requireUserCompanyAccess({
    nextPath: BILLING_ROUTE,
    enforceBilling: false,
  });

  const checkoutRateLimit = await enforceActionRateLimit({
    scope: "billing_checkout_start",
    companyId: access.companyId,
    maxSubmissions: 8,
    windowMinutes: 15,
  });

  if (!checkoutRateLimit.allowed) {
    redirectBillingError("Zu viele Checkout-Versuche. Bitte versuchen Sie es später erneut.");
  }

  if (!access.isOwner) {
    redirectBillingError("Nur Eigentümer können ein Abonnement starten.");
  }

  if (formData.get("legal_acceptance") !== "on") {
    redirectBillingError("Bitte bestätigen Sie AGB und Datenschutzhinweise.");
  }

  await acceptBillingLegalTerms({
    companyId: access.companyId,
    sourcePath: BILLING_ROUTE,
    userId: access.userId,
  });

  const stripe = createStripeServerClient();
  const [price, company, billing] = await Promise.all([
    getStripeMonthlyPriceForMarket(stripe, market),
    getCompanyForBilling(access.companyId),
    getCompanyBillingSnapshot(access.companyId),
  ]);

  const priceProductId =
    typeof price.product === "string" ? price.product : price.product.id;

  if (
    hasLiveSubscription(billing) ||
    (await hasLiveStripeSubscription(stripe, billing.stripeCustomerId))
  ) {
    redirectBillingError(
      "Für diese Firma besteht bereits ein Abonnement. Bitte verwalten Sie es über „Abonnement verwalten“.",
    );
  }

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: {
      company_id: access.companyId,
      lookup_key: BILLING_LOOKUP_KEY,
      plan: "pro",
    },
  };

  const trial = resolveCheckoutTrial(billing, new Date());

  if (trial.kind === "days") {
    subscriptionData.trial_period_days = trial.days;
  } else if (trial.kind === "until") {
    subscriptionData.trial_end = trial.unix;
  }

  if (trial.kind !== "none") {
    subscriptionData.trial_settings = {
      end_behavior: { missing_payment_method: "cancel" },
    };
  }

  const shouldGrantTrial = trial.kind !== "none";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_collection: "always",
    success_url: `${siteUrl}${BILLING_ROUTE}?success=checkout`,
    cancel_url: `${siteUrl}${BILLING_ROUTE}?canceled=1`,
    line_items: [{ price: price.id, quantity: 1 }],
    automatic_tax: { enabled: true },
    client_reference_id: access.companyId,
    customer: billing.stripeCustomerId ?? undefined,
    customer_email: billing.stripeCustomerId ? undefined : company.email,
    locale: market === "us" ? "en" : "de",
    metadata: {
      company_id: access.companyId,
      lookup_key: BILLING_LOOKUP_KEY,
      plan: "pro",
    },
    subscription_data: subscriptionData,
  });

  const checkoutUrl =
    session.url ?? redirectBillingError("Stripe Checkout konnte nicht gestartet werden.");

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({
      stripe_customer_id: billing.stripeCustomerId ?? (typeof session.customer === "string" ? session.customer : null),
      stripe_price_id: price.id,
      stripe_product_id: priceProductId,
      plan: "pro",
    })
    .eq("company_id", access.companyId);

  if (error) {
    redirectBillingError("Stripe Checkout konnte nicht vorbereitet werden.");
  }

  trackAnalyticsEvent({
    eventName: "billing_checkout_started",
    market,
    companyId: access.companyId,
    isAuthenticated: true,
    metadata: {
      trialGranted: shouldGrantTrial,
      hasStripeCustomer: Boolean(billing.stripeCustomerId),
    },
  });

  redirect(checkoutUrl);
}

export async function openBillingPortalAction() {
  let siteUrl = publicEnv.appUrl;
  let market: MarketCode = "de";

  try {
    const requestMarket = await getRequestMarket();
    market = requestMarket.market;
    siteUrl = requestMarket.config.siteUrl;
  } catch {
    // Fall back to existing environment URL outside request scope.
  }

  const access = await requireUserCompanyAccess({
    nextPath: BILLING_ROUTE,
    enforceBilling: false,
  });

  const portalRateLimit = await enforceActionRateLimit({
    scope: "billing_portal_open",
    companyId: access.companyId,
    maxSubmissions: 12,
    windowMinutes: 10,
  });

  if (!portalRateLimit.allowed) {
    redirectBillingError("Zu viele Portal-Anfragen. Bitte versuchen Sie es später erneut.");
  }

  if (!access.isOwner) {
    redirectBillingError("Nur Eigentümer können das Abonnement verwalten.");
  }

  const stripe = createStripeServerClient();
  const billing = await getCompanyBillingSnapshot(access.companyId);

  const customerId =
    billing.stripeCustomerId ??
    redirectBillingError("Es wurde noch kein Stripe-Kunde für diese Firma angelegt.");

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl}${BILLING_ROUTE}`,
  });

  trackAnalyticsEvent({
    eventName: "billing_portal_opened",
    market,
    companyId: access.companyId,
    isAuthenticated: true,
    metadata: {
      hasStripeCustomer: true,
    },
  });

  redirect(session.url);
}