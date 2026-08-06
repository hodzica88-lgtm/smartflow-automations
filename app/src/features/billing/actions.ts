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

const canGrantCheckoutTrial = (
  billing: Awaited<ReturnType<typeof getCompanyBillingSnapshot>>,
) => {
  if (billing.trialUsedAt) {
    return false;
  }

  if (billing.stripeSubscriptionId) {
    return false;
  }

  if (billing.status === "active") {
    return false;
  }

  return true;
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

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: {
      company_id: access.companyId,
      lookup_key: BILLING_LOOKUP_KEY,
      plan: "pro",
    },
  };

  const trialGrantedAt = new Date();
  const shouldGrantTrial = canGrantCheckoutTrial(billing);

  if (shouldGrantTrial) {
    subscriptionData.trial_period_days = BILLING_TRIAL_DAYS;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${siteUrl}${BILLING_ROUTE}?success=checkout`,
    cancel_url: `${siteUrl}${BILLING_ROUTE}?canceled=1`,
    line_items: [{ price: price.id, quantity: 1 }],
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
      current_period_end: shouldGrantTrial
        ? new Date(
            trialGrantedAt.getTime() + BILLING_TRIAL_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString()
        : billing.currentPeriodEnd,
      current_period_start: shouldGrantTrial
        ? trialGrantedAt.toISOString()
        : billing.currentPeriodStart,
      status: shouldGrantTrial ? "trialing" : billing.status,
      stripe_customer_id: billing.stripeCustomerId ?? (typeof session.customer === "string" ? session.customer : null),
      stripe_price_id: price.id,
      stripe_product_id: priceProductId,
      plan: "pro",
      trial_ends_at: shouldGrantTrial
        ? new Date(
            trialGrantedAt.getTime() + BILLING_TRIAL_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString()
        : billing.trialEndsAt,
      trial_started_at: shouldGrantTrial
        ? trialGrantedAt.toISOString()
        : billing.trialStartedAt,
      trial_used_at: shouldGrantTrial
        ? trialGrantedAt.toISOString()
        : billing.trialUsedAt,
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