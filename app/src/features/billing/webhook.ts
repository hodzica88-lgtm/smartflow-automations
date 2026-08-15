import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { BILLING_LOOKUP_KEY, normalizeBillingStatus, upsertCompanySubscription } from "@/features/billing/service";
import { createAppNotification } from "@/features/notifications/service";
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

const getTrialWillEndNotificationCopy = (market: "de" | "us" | "unknown") => {
  if (market === "us") {
    return {
      title: "Your trial ends soon",
      message: "Your free trial ends in 3 days. Your paid subscription will begin afterwards.",
    };
  }

  return {
    title: "Testphase endet bald",
    message: "Ihre kostenlose Testphase endet in 3 Tagen. Danach beginnt das kostenpflichtige Abonnement.",
  };
};

const getCompanyMarket = async (companyId: string): Promise<"de" | "us" | "unknown"> => {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("companies")
      .select("market")
      .eq("id", companyId)
      .maybeSingle();

    if (error || !data) {
      return "unknown";
    }

    if (data.market === "us") {
      return "us";
    }

    if (data.market === "de") {
      return "de";
    }
  } catch {
    // Allow webhook processing to continue even when the market column is unavailable.
  }

  return "unknown";
};

const isSubscriptionScheduledForTrialCancellation = (
  subscription: Pick<Stripe.Subscription, "cancel_at" | "cancel_at_period_end">,
  trialEnd: number | null | undefined,
) => {
  if (subscription.cancel_at_period_end) {
    return true;
  }

  if (!trialEnd || !subscription.cancel_at) {
    return false;
  }

  return subscription.cancel_at <= trialEnd;
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
    cancelAt: toIsoString(subscription.cancel_at),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    stripeProductId: productId,
    plan: "pro",
    status: normalizeBillingStatus(subscription.status),
    currentPeriodStart: toIsoString(currentPeriodStart),
    currentPeriodEnd: toIsoString(currentPeriodEnd),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    trialStartedAt: toIsoString(subscription.trial_start),
    trialEndsAt: toIsoString(subscription.trial_end),
    trialUsedAt: toIsoString(subscription.trial_start) ?? new Date().toISOString(),
    canceledAt: toIsoString(subscription.canceled_at),
  });
};

type SubscriptionEventType =
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted";

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

const createAppNotificationSafe = async (
  input: Parameters<typeof createAppNotification>[0],
) => {
  try {
    await createAppNotification(input);
  } catch {
    // Notification center must not block billing state synchronization.
  }
};

const handleSubscriptionEvent = async (
  subscription: Stripe.Subscription,
  stripe: Stripe,
  eventType: SubscriptionEventType,
) => {
  const companyId = await resolveCompanyIdForSubscriptionEvent(subscription);

  if (!companyId) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: previousSub } = await supabase
    .from("subscriptions")
    .select("status, cancel_at_period_end")
    .limit(1)
    .eq("company_id", companyId)
    .maybeSingle();
  const previousStatus = String(previousSub?.status ?? "inactive");
  const previousCancelAtPeriodEnd = Boolean(previousSub?.cancel_at_period_end);

  if (eventType === "customer.subscription.deleted") {
    await syncSubscription(companyId, subscription);
    await createAppNotificationSafe({
      companyId,
      type: "subscription_canceled",
      title: "Abo gekündigt",
      message: "Das Abonnement wurde beendet.",
      dedupeKey: `subscription_canceled:${subscription.id}:${eventType}`,
      metadata: { stripeSubscriptionId: subscription.id },
    });
    return;
  }

  try {
    const refreshed = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ["items.data.price.product"],
    });

    await syncSubscription(companyId, refreshed);

    const nextStatus = normalizeBillingStatus(refreshed.status);
    const nextCancelAtPeriodEnd = refreshed.cancel_at_period_end ?? false;

    if (previousStatus === "canceled" && (nextStatus === "active" || nextStatus === "trialing")) {
      await createAppNotificationSafe({
        companyId,
        type: "subscription_reactivated",
        title: "Abo wieder aktiviert",
        message: "Das Abonnement wurde wieder aktiviert.",
        dedupeKey: `subscription_reactivated:${subscription.id}`,
        metadata: { stripeSubscriptionId: subscription.id },
      });
    }

    if (nextStatus === "canceled" || nextCancelAtPeriodEnd) {
      if (!(previousStatus === "canceled" || previousCancelAtPeriodEnd)) {
        await createAppNotificationSafe({
          companyId,
          type: "subscription_canceled",
          title: "Abo gekündigt",
          message: "Das Abonnement wurde zur Kündigung markiert.",
          dedupeKey: `subscription_canceled:${subscription.id}`,
          metadata: { stripeSubscriptionId: subscription.id },
        });
      }
    }
  } catch {
    await syncSubscription(companyId, subscription);
  }
};

const handleTrialWillEnd = async (subscription: Stripe.Subscription, stripe: Stripe) => {
  const companyId = await resolveCompanyIdForSubscriptionEvent(subscription);

  if (!companyId) {
    return;
  }

  const refreshed = await stripe.subscriptions.retrieve(subscription.id, {
    expand: ["items.data.price.product"],
  });

  if (normalizeBillingStatus(refreshed.status) !== "trialing") {
    return;
  }

  const trialEnd = refreshed.trial_end ?? subscription.trial_end ?? null;

  if (!trialEnd) {
    return;
  }

  if (isSubscriptionScheduledForTrialCancellation(refreshed, trialEnd)) {
    return;
  }

  const market = await getCompanyMarket(companyId);
  const { title, message } = getTrialWillEndNotificationCopy(market);

  await createAppNotificationSafe({
    companyId,
    type: "trial_ends_7_days",
    title,
    message,
    dedupeKey: `trial_will_end:${refreshed.id}:${trialEnd}`,
    metadata: {
      stripeSubscriptionId: refreshed.id,
      trialEnd,
      source: "trial_will_end",
    },
  });
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

  if (invoice.status === "open") {
    const companyId = await findCompanyIdByStripeReference(
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null,
      subscriptionId,
    );

    if (companyId) {
      await createAppNotificationSafe({
        companyId,
        type: "payment_failed",
        title: "Zahlung fehlgeschlagen",
        message: "Eine Abonnement-Zahlung konnte nicht verarbeitet werden.",
        dedupeKey: `payment_failed:${invoice.id}`,
        metadata: { stripeSubscriptionId: subscriptionId, stripeInvoiceId: invoice.id },
      });
    }
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price.product"],
  });

  await handleSubscriptionEvent(subscription, stripe, "customer.subscription.updated");
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
      await handleSubscriptionEvent(
        event.data.object as Stripe.Subscription,
        stripe,
        "customer.subscription.created",
      );
      break;
    case "customer.subscription.updated":
      await handleSubscriptionEvent(
        event.data.object as Stripe.Subscription,
        stripe,
        "customer.subscription.updated",
      );
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionEvent(
        event.data.object as Stripe.Subscription,
        stripe,
        "customer.subscription.deleted",
      );
      break;
    case "customer.subscription.trial_will_end":
      await handleTrialWillEnd(event.data.object as Stripe.Subscription, stripe);
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