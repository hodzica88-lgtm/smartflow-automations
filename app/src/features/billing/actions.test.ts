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
  market: "de" as "de" | "us",
  priceCurrency: "eur" as "eur" | "usd",
  subscriptionsUpdatePayload: null as Record<string, unknown> | null,
}));

vi.mock("@/shared/i18n/request", () => ({
  getRequestMarket: vi.fn(async () => {
    if (state.market === "us") {
      return {
        market: "us",
        host: "varnito.com",
        config: {
          code: "us",
          currency: "usd",
          domain: "varnito.com",
          language: "en",
          legalContactEmail: "contact@varnito.com",
          locale: "en-US",
          siteUrl: "https://varnito.com",
        },
      };
    }

    return {
      market: "de",
      host: "varnito.de",
      config: {
        code: "de",
        currency: "eur",
        domain: "varnito.de",
        language: "de",
        legalContactEmail: "kontakt@varnito.de",
        locale: "de-DE",
        siteUrl: "https://varnito.de",
      },
    };
  }),
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
            currency: state.priceCurrency,
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
    state.market = "de";
    state.priceCurrency = "eur";
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

  it("uses US checkout locale, currency-matched price and varnito.com return URLs", async () => {
    state.market = "us";
    state.priceCurrency = "usd";

    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );

    expect(state.checkoutPayload?.locale).toBe("en");
    expect(state.checkoutPayload?.success_url).toBe(
      "https://varnito.com/dashboard/billing?success=checkout",
    );
    expect(state.checkoutPayload?.cancel_url).toBe(
      "https://varnito.com/dashboard/billing?canceled=1",
    );
  });
});