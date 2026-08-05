import { redirect } from "next/navigation";

import { getUserCompanyState } from "@/features/onboarding/company";
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

const BILLING_STATUS_SET = new Set<string>(BILLING_STATUSES);

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
  input: Pick<BillingSnapshot, "status" | "trialEndsAt" | "currentPeriodEnd">,
  now: Date = new Date(),
) => {
  if (input.status === "active") {
    return true;
  }

  if (input.status === "trialing") {
    return toFuture(input.trialEndsAt ?? input.currentPeriodEnd, now);
  }

  return false;
};

export const getBillingLockReason = (
  input: Pick<BillingSnapshot, "status" | "trialEndsAt" | "currentPeriodEnd">,
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

const toSnapshot = (
  companyId: string,
  row: BillingSubscriptionRow | null,
  now: Date = new Date(),
): BillingSnapshot => {
  const snapshot: BillingSnapshot = {
    companyId,
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
      "company_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_product_id, plan, status, current_period_start, current_period_end, cancel_at_period_end, trial_started_at, trial_ends_at, trial_used_at, canceled_at",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return toSnapshot(companyId, (data as BillingSubscriptionRow | null) ?? null, now);
};

type UpsertCompanySubscriptionInput = {
  companyId: string;
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