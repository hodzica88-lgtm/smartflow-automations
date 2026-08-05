"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";

import {
  BILLING_LOOKUP_KEY,
  BILLING_ROUTE,
  requireUserCompanyAccess,
  getCompanyBillingSnapshot,
} from "@/features/billing/service";
import { publicEnv } from "@/shared/config/env";
import { createStripeServerClient } from "@/shared/lib/stripe/server";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

const redirectBillingError = (message: string): never => {
  redirect(`${BILLING_ROUTE}?error=${encodeURIComponent(message)}`);
};

const getStripePrice = async (stripe: Stripe) => {
  const prices = await stripe.prices.list({
    active: true,
    expand: ["data.product"],
    lookup_keys: [BILLING_LOOKUP_KEY],
    limit: 1,
  });

  const price = prices.data[0];

  if (!price || price.currency !== "eur" || price.recurring?.interval !== "month") {
    throw new Error("Der Stripe-Preis für Varnito Pro konnte nicht geladen werden.");
  }

  return price;
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

export async function startBillingCheckoutAction() {
  const access = await requireUserCompanyAccess({
    nextPath: BILLING_ROUTE,
    enforceBilling: false,
  });

  if (!access.isOwner) {
    redirectBillingError("Nur Eigentümer können ein Abonnement starten.");
  }

  const stripe = createStripeServerClient();
  const [price, company, billing] = await Promise.all([
    getStripePrice(stripe),
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

  if (
    billing.status === "trialing" &&
    billing.trialEndsAt &&
    Date.parse(billing.trialEndsAt) > Date.now()
  ) {
    subscriptionData.trial_end = Math.floor(Date.parse(billing.trialEndsAt) / 1000);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${publicEnv.appUrl}${BILLING_ROUTE}?success=checkout`,
    cancel_url: `${publicEnv.appUrl}${BILLING_ROUTE}?canceled=1`,
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: access.companyId,
    customer: billing.stripeCustomerId ?? undefined,
    customer_email: billing.stripeCustomerId ? undefined : company.email,
    locale: "de",
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

  redirect(checkoutUrl);
}

export async function openBillingPortalAction() {
  const access = await requireUserCompanyAccess({
    nextPath: BILLING_ROUTE,
    enforceBilling: false,
  });

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
    return_url: `${publicEnv.appUrl}${BILLING_ROUTE}`,
  });

  redirect(session.url);
}