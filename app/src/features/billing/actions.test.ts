import { beforeEach, describe, expect, it, vi } from "vitest";

type BillingSnapshotMock = {
  cancelAt: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  companyId: string;
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  hasAppAccess: boolean;
  lockReason: string | null;
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
  stripeProductId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  trialStartedAt: string | null;
  trialUsedAt: string | null;
};

const state = vi.hoisted(() => ({
  billingSnapshot: {
    cancelAt: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    companyId: "company_a",
    currentPeriodEnd: null,
    currentPeriodStart: null,
    hasAppAccess: false,
    lockReason: "no_subscription",
    plan: "free",
    status: "inactive",
    stripeCustomerId: null,
    stripePriceId: null,
    stripeProductId: null,
    stripeSubscriptionId: null,
    trialEndsAt: null,
    trialStartedAt: null,
    trialUsedAt: null,
  } as BillingSnapshotMock,
  checkoutPayload: null as Record<string, unknown> | null,
  subscriptionsUpdatePayload: null as Record<string, unknown> | null,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("@/shared/config/env", () => ({
  publicEnv: {
    appUrl: "http://localhost:3000",
  },
}));

vi.mock("@/features/billing/service", () => ({
  BILLING_LOOKUP_KEY: "varnito_pro_monthly",
  BILLING_ROUTE: "/dashboard/billing",
  BILLING_TRIAL_DAYS: 30,
  getCompanyBillingSnapshot: vi.fn(async () => state.billingSnapshot),
  requireUserCompanyAccess: vi.fn(async () => ({
    companyId: "company_a",
    isOwner: true,
    userId: "user_a",
  })),
}));

vi.mock("@/shared/lib/stripe/server", () => ({
  createStripeServerClient: () => ({
    checkout: {
      sessions: {
        create: vi.fn(async (payload: Record<string, unknown>) => {
          state.checkoutPayload = payload;
          return {
            customer: "cus_test_1",
            url: "https://checkout.stripe.test/session_1",
          };
        }),
      },
    },
    prices: {
      list: vi.fn(async () => ({
        data: [
          {
            currency: "eur",
            id: "price_test_1",
            product: "prod_test_1",
            recurring: {
              interval: "month",
            },
          },
        ],
      })),
    },
  }),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: vi.fn(() => ({
    from(table: string) {
      if (table === "companies") {
        return {
          select() {
            return {
              eq() {
                return {
                  is() {
                    return {
                      async maybeSingle() {
                        return {
                          data: {
                            email: "owner@example.com",
                            id: "company_a",
                            name: "Company A",
                          },
                          error: null,
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "subscriptions") {
        return {
          update(payload: Record<string, unknown>) {
            state.subscriptionsUpdatePayload = payload;
            return {
              async eq() {
                return { error: null };
              },
            };
          },
        };
      }

      if (table === "legal_acceptances") {
        return {
          insert() {
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

const { startBillingCheckoutAction } = await import("./actions");

describe("stripe billing checkout trial", () => {
  beforeEach(() => {
    state.billingSnapshot = {
      cancelAt: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      companyId: "company_a",
      currentPeriodEnd: null,
      currentPeriodStart: null,
      hasAppAccess: false,
      lockReason: "no_subscription",
      plan: "free",
      status: "inactive",
      stripeCustomerId: null,
      stripePriceId: null,
      stripeProductId: null,
      stripeSubscriptionId: null,
      trialEndsAt: null,
      trialStartedAt: null,
      trialUsedAt: null,
    };
    state.checkoutPayload = null;
    state.subscriptionsUpdatePayload = null;
  });

  const createCheckoutFormData = () => {
    const formData = new FormData();
    formData.set("legal_acceptance", "on");
    return formData;
  };

  it("sets 30-day trial for first checkout", async () => {
    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );

    const subscriptionData = (state.checkoutPayload?.subscription_data ?? {}) as {
      trial_period_days?: number;
    };
    expect(subscriptionData.trial_period_days).toBe(30);
  });

  it("does not grant second trial when trial_used_at exists", async () => {
    state.billingSnapshot.trialUsedAt = new Date().toISOString();

    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );

    const subscriptionData = (state.checkoutPayload?.subscription_data ?? {}) as {
      trial_period_days?: number;
    };
    expect(subscriptionData.trial_period_days).toBeUndefined();
  });

  it("does not grant trial when active subscription already exists", async () => {
    state.billingSnapshot.status = "active";
    state.billingSnapshot.stripeSubscriptionId = "sub_existing_1";

    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );

    const subscriptionData = (state.checkoutPayload?.subscription_data ?? {}) as {
      trial_period_days?: number;
    };
    expect(subscriptionData.trial_period_days).toBeUndefined();
  });
});