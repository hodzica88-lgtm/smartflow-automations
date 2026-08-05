import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { BILLING_LOOKUP_KEY, normalizeBillingStatus, upsertCompanySubscription } from "@/features/billing/service";
import { loadServerEnv } from "@/shared/config/env";
import { createStripeServerClient } from "@/shared/lib/stripe/server";
import { createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

type StripeWebhookEventRow = {
  id: string;
  processed_at: string | null;
};

const toIsoString = (timestamp: number | null | undefined) => {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString();
};

const getStripeObjectId = (object: Stripe.Event.Data.Object) => {
  return "id" in object && typeof object.id === "string" ? object.id : null;
};

const getCompanyIdFromSubscription = (subscription: Stripe.Subscription) => {
  const metadataCompanyId = subscription.metadata?.company_id?.trim();
  return metadataCompanyId || null;
};

const getPriceDetails = (subscription: Stripe.Subscription) => {
  const item = subscription.items.data[0];
  const price = item?.price;

  if (!price) {
    return {
      priceId: null,
      productId: null,
    };
  }

  return {
    priceId: price.id,
    productId:
      typeof price.product === "string" ? price.product : price.product?.id ?? null,
  };
};

const getCurrentPeriod = (subscription: Stripe.Subscription) => {
  const item = subscription.items.data[0];

  return {
    currentPeriodEnd: item?.current_period_end ?? null,
    currentPeriodStart: item?.current_period_start ?? null,
  };
};

const findCompanyIdByStripeReference = async (
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
) => {
  const supabase = createSupabaseServiceRoleClient();
  let query = supabase
    .from("subscriptions")
    .select("company_id")
    .limit(1);

  if (stripeSubscriptionId) {
    query = query.eq("stripe_subscription_id", stripeSubscriptionId);
  } else if (stripeCustomerId) {
    query = query.eq("stripe_customer_id", stripeCustomerId);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data?.company_id ?? null;
};

const syncSubscription = async (companyId: string, subscription: Stripe.Subscription) => {
  const { priceId, productId } = getPriceDetails(subscription);
  const { currentPeriodEnd, currentPeriodStart } = getCurrentPeriod(subscription);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  await upsertCompanySubscription({
    companyId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    stripeProductId: productId,
    plan: "pro",
    status: normalizeBillingStatus(subscription.status),
    currentPeriodStart: toIsoString(currentPeriodStart),
    currentPeriodEnd: toIsoString(currentPeriodEnd),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialStartedAt: toIsoString(subscription.trial_start),
    trialEndsAt: toIsoString(subscription.trial_end),
    trialUsedAt: toIsoString(subscription.trial_start) ?? new Date().toISOString(),
    canceledAt: toIsoString(subscription.canceled_at),
  });
};

const markWebhookProcessed = async (stripeEventId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("stripe_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("stripe_event_id", stripeEventId);

  if (error) {
    throw error;
  }
};

const getExistingWebhookEvent = async (stripeEventId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("id, processed_at")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as StripeWebhookEventRow | null) ?? null;
};

const registerWebhookEvent = async (event: Stripe.Event) => {
  const existing = await getExistingWebhookEvent(event.id);

  if (existing?.processed_at) {
    return true;
  }

  if (!existing) {
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      stripe_object_id: getStripeObjectId(event.data.object),
    });

    if (error && !String(error.message ?? "").includes("duplicate key")) {
      throw error;
    }
  }

  return false;
};

const resolveCompanyIdForSession = async (session: Stripe.Checkout.Session) => {
  const companyId = session.client_reference_id?.trim() || session.metadata?.company_id?.trim();
  return companyId || null;
};

const resolveCompanyIdForSubscriptionEvent = async (subscription: Stripe.Subscription) => {
  const metadataCompanyId = getCompanyIdFromSubscription(subscription);

  if (metadataCompanyId) {
    return metadataCompanyId;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  return findCompanyIdByStripeReference(customerId, subscription.id);
};

const handleCheckoutCompleted = async (
  session: Stripe.Checkout.Session,
  stripe: Stripe,
) => {
  if (session.mode !== "subscription") {
    return;
  }

  const companyId = await resolveCompanyIdForSession(session);

  if (!companyId) {
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  await upsertCompanySubscription({
    companyId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    plan: "pro",
  });

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price.product"],
    });

    await syncSubscription(companyId, subscription);
  }
};

const handleSubscriptionEvent = async (subscription: Stripe.Subscription) => {
  const companyId = await resolveCompanyIdForSubscriptionEvent(subscription);

  if (!companyId) {
    return;
  }

  await syncSubscription(companyId, subscription);
};

const handleInvoiceEvent = async (invoice: Stripe.Invoice, stripe: Stripe) => {
  const invoiceSubscription = invoice as Stripe.Invoice & {
    subscription?: string | { id?: string | null } | null;
  };
  const subscriptionId =
    typeof invoiceSubscription.subscription === "string"
      ? invoiceSubscription.subscription
      : invoiceSubscription.subscription?.id ?? null;

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price.product"],
  });

  await handleSubscriptionEvent(subscription);
};

export const processStripeEvent = async (event: Stripe.Event) => {
  const alreadyProcessed = await registerWebhookEvent(event);

  if (alreadyProcessed) {
    return;
  }

  const stripe = createStripeServerClient();

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, stripe);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
    case "invoice.payment_failed":
      await handleInvoiceEvent(event.data.object as Stripe.Invoice, stripe);
      break;
    default:
      break;
  }

  await markWebhookProcessed(event.id);
};

export const processStripeWebhookRequest = async (request: Request) => {
  const { stripeWebhookSecret } = loadServerEnv();

  if (!stripeWebhookSecret) {
    return NextResponse.json({ ok: false, message: "Webhook secret fehlt." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ ok: false, message: "Fehlende Stripe-Signatur." }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = createStripeServerClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Stripe-Signatur." }, { status: 400 });
  }

  await processStripeEvent(event);

  return NextResponse.json({ ok: true });
};

export const BILLING_PRODUCT_LOOKUP_KEY = BILLING_LOOKUP_KEY;