import { redirect } from "next/navigation";
import type Stripe from "stripe";

import { getUserCompanyState } from "@/features/onboarding/company";
import { createStripeServerClient } from "@/shared/lib/stripe/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/shared/lib/supabase/server";

export const BILLING_ROUTE = "/dashboard/billing";
export const BILLING_LOOKUP_KEY = "varnito_pro_monthly";
export const BILLING_TRIAL_DAYS = 30;

export const BILLING_STATUSES = [
  "inactive",
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

export type BillingStatus = (typeof BILLING_STATUSES)[number];

type BillingSubscriptionRow = {
  company_id: string;
  cancel_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  plan: string | null;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_used_at: string | null;
  canceled_at: string | null;
};

export type BillingSnapshot = {
  companyId: string;
  cancelAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeProductId: string | null;
  plan: string;
  status: BillingStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialUsedAt: string | null;
  canceledAt: string | null;
  hasAppAccess: boolean;
  lockReason: string | null;
};

export type AppCompanyAccess = {
  companyId: string;
  userId: string;
  isOwner: boolean;
  billing: BillingSnapshot;
};

type BillingAccessInput = Pick<
  BillingSnapshot,
  "cancelAt" | "cancelAtPeriodEnd" | "currentPeriodEnd" | "status" | "trialEndsAt"
>;

const BILLING_STATUS_SET = new Set<string>(BILLING_STATUSES);

const toIsoString = (timestamp: number | null | undefined) => {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString();
};

const getStripeCurrentPeriod = (subscription: Stripe.Subscription) => {
  const item = subscription.items.data[0];

  return {
    currentPeriodEnd: item?.current_period_end ?? null,
    currentPeriodStart: item?.current_period_start ?? null,
  };
};

const toFuture = (value: string | null, now: Date) => {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > now.getTime();
};

export const normalizeBillingStatus = (value: string | null | undefined): BillingStatus => {
  if (value && BILLING_STATUS_SET.has(value)) {
    return value as BillingStatus;
  }

  return "inactive";
};

export const hasBillingAccess = (
  input: BillingAccessInput,
  now: Date = new Date(),
) => {
  if (input.status === "active") {
    return true;
  }

  if (input.status === "trialing") {
    return toFuture(input.trialEndsAt ?? input.currentPeriodEnd, now);
  }

  if (input.status === "canceled") {
    if (toFuture(input.cancelAt, now)) {
      return true;
    }

    if (input.cancelAtPeriodEnd && toFuture(input.currentPeriodEnd, now)) {
      return true;
    }
  }

  return false;
};

export const getBillingLockReason = (
  input: BillingAccessInput,
  now: Date = new Date(),
) => {
  if (hasBillingAccess(input, now)) {
    return null;
  }

  switch (input.status) {
    case "trialing":
      return "trial_expired";
    case "past_due":
    case "unpaid":
      return "payment_required";
    case "incomplete":
    case "incomplete_expired":
      return "checkout_incomplete";
    case "paused":
      return "subscription_paused";
    case "canceled":
      return "subscription_canceled";
    default:
      return "no_subscription";
  }
};

export const getPlannedCancellationDate = (
  input: Pick<BillingSnapshot, "cancelAt" | "cancelAtPeriodEnd" | "currentPeriodEnd">,
  now: Date = new Date(),
) => {
  if (toFuture(input.cancelAt, now)) {
    return input.cancelAt;
  }

  if (input.cancelAtPeriodEnd && toFuture(input.currentPeriodEnd, now)) {
    return input.currentPeriodEnd;
  }

  return null;
};

export const isCancellationPlanned = (
  input: Pick<BillingSnapshot, "cancelAt" | "cancelAtPeriodEnd" | "currentPeriodEnd">,
  now: Date = new Date(),
) => getPlannedCancellationDate(input, now) !== null;

const toSnapshot = (
  companyId: string,
  row: BillingSubscriptionRow | null,
  now: Date = new Date(),
): BillingSnapshot => {
  const snapshot: BillingSnapshot = {
    companyId,
    cancelAt: row?.cancel_at ?? null,
    stripeCustomerId: row?.stripe_customer_id ?? null,
    stripeSubscriptionId: row?.stripe_subscription_id ?? null,
    stripePriceId: row?.stripe_price_id ?? null,
    stripeProductId: row?.stripe_product_id ?? null,
    plan: row?.plan ?? "free",
    status: normalizeBillingStatus(row?.status),
    currentPeriodStart: row?.current_period_start ?? null,
    currentPeriodEnd: row?.current_period_end ?? null,
    cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
    trialStartedAt: row?.trial_started_at ?? null,
    trialEndsAt: row?.trial_ends_at ?? null,
    trialUsedAt: row?.trial_used_at ?? null,
    canceledAt: row?.canceled_at ?? null,
    hasAppAccess: false,
    lockReason: null,
  };

  snapshot.hasAppAccess = hasBillingAccess(snapshot, now);
  snapshot.lockReason = getBillingLockReason(snapshot, now);

  return snapshot;
};

export const getBillingRouteHref = (reason?: string | null) => {
  if (!reason) {
    return BILLING_ROUTE;
  }

  return `${BILLING_ROUTE}?billing=${encodeURIComponent(reason)}`;
};

export const getCompanyBillingSnapshot = async (
  companyId: string,
  now: Date = new Date(),
) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "company_id, cancel_at, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_product_id, plan, status, current_period_start, current_period_end, cancel_at_period_end, trial_started_at, trial_ends_at, trial_used_at, canceled_at",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return toSnapshot(companyId, (data as BillingSubscriptionRow | null) ?? null, now);
};

type SyncOwnerCompanyBillingFromStripeInput = {
  companyId: string;
  ownerUserId: string;
};

export const syncOwnerCompanyBillingFromStripe = async (
  input: SyncOwnerCompanyBillingFromStripeInput,
) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("id", input.companyId)
    .eq("owner_user_id", input.ownerUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (companyError) {
    throw companyError;
  }

  if (!company) {
    throw new Error("Nur Eigentümer dürfen das Billing synchronisieren.");
  }

  const { data: subscriptionRow, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (subscriptionError) {
    throw subscriptionError;
  }

  const stripeSubscriptionId = subscriptionRow?.stripe_subscription_id ?? null;

  if (!stripeSubscriptionId) {
    return null;
  }

  const stripe = createStripeServerClient();
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ["items.data.price.product"],
  });
  const { currentPeriodEnd, currentPeriodStart } = getStripeCurrentPeriod(subscription);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;
  const firstItem = subscription.items.data[0];
  const price = firstItem?.price;
  const stripePriceId = price?.id ?? null;
  const stripeProductId =
    typeof price?.product === "string"
      ? price.product
      : price?.product?.id ?? null;

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      cancel_at: toIsoString(subscription.cancel_at),
      canceled_at: toIsoString(subscription.canceled_at),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      current_period_end: toIsoString(currentPeriodEnd),
      current_period_start: toIsoString(currentPeriodStart),
      plan: "pro",
      status: normalizeBillingStatus(subscription.status),
      stripe_customer_id: customerId,
      stripe_price_id: stripePriceId,
      stripe_product_id: stripeProductId,
      stripe_subscription_id: subscription.id,
      trial_ends_at: toIsoString(subscription.trial_end),
      trial_started_at: toIsoString(subscription.trial_start),
      trial_used_at: subscription.trial_start ? toIsoString(subscription.trial_start) : null,
    })
    .eq("company_id", input.companyId);

  if (updateError) {
    throw updateError;
  }

  return getCompanyBillingSnapshot(input.companyId);
};

type UpsertCompanySubscriptionInput = {
  companyId: string;
  cancelAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  plan?: string;
  status?: BillingStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  trialUsedAt?: string | null;
  canceledAt?: string | null;
};

export const upsertCompanySubscription = async (
  input: UpsertCompanySubscriptionInput,
) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("company_id")
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const payload = {
    cancel_at: input.cancelAt,
    stripe_customer_id: input.stripeCustomerId,
    stripe_subscription_id: input.stripeSubscriptionId,
    stripe_price_id: input.stripePriceId,
    stripe_product_id: input.stripeProductId,
    plan: input.plan,
    status: input.status,
    current_period_start: input.currentPeriodStart,
    current_period_end: input.currentPeriodEnd,
    cancel_at_period_end: input.cancelAtPeriodEnd,
    trial_started_at: input.trialStartedAt,
    trial_ends_at: input.trialEndsAt,
    trial_used_at: input.trialUsedAt,
    canceled_at: input.canceledAt,
  };

  const query = existing
    ? supabase.from("subscriptions").update(payload).eq("company_id", input.companyId)
    : supabase.from("subscriptions").insert({ company_id: input.companyId, ...payload });

  const { error } = await query;

  if (error) {
    throw error;
  }
};

type RequireUserCompanyAccessOptions = {
  allowMember?: boolean;
  nextPath: string;
  enforceBilling?: boolean;
};

export const requireUserCompanyAccess = async (
  options: RequireUserCompanyAccessOptions,
): Promise<AppCompanyAccess> => {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(options.nextPath)}`);
  }

  const companyState = await getUserCompanyState(user.id, {
    allowMember: options.allowMember,
  });

  if (!companyState.companyId) {
    redirect("/onboarding");
  }

  const billing = await getCompanyBillingSnapshot(companyState.companyId);

  if (options.enforceBilling !== false && !billing.hasAppAccess) {
    redirect(getBillingRouteHref(billing.lockReason));
  }

  return {
    companyId: companyState.companyId,
    userId: user.id,
    isOwner: companyState.isOwner,
    billing,
  };
};

export const getBillingStatusLabel = (status: BillingStatus) => {
  switch (status) {
    case "trialing":
      return "Testphase aktiv";
    case "active":
      return "Abo aktiv";
    case "past_due":
      return "Zahlung überfällig";
    case "unpaid":
      return "Unbezahlt";
    case "canceled":
      return "Gekündigt";
    case "incomplete":
      return "Checkout unvollständig";
    case "incomplete_expired":
      return "Checkout abgelaufen";
    case "paused":
      return "Pausiert";
    default:
      return "Nicht aktiv";
  }
};