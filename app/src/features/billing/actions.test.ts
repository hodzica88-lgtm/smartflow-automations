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
  priceRetrieveId: null as string | null,
  stripeSubscriptions: [] as Array<{ id: string; status: string }>,
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
          legalContactEmail: "support@varnito.com",
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
        legalContactEmail: "support@varnito.com",
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
    subscriptions: {
      list: vi.fn(async () => ({ data: state.stripeSubscriptions })),
    },
    prices: {
      retrieve: vi.fn(async (priceId: string) => {
        state.priceRetrieveId = priceId;
        return {
          active: true,
          currency: state.priceCurrency,
          id: priceId,
          product: "prod_test_1",
          recurring: {
            interval: "month",
          },
          unit_amount: state.priceCurrency === "usd" ? 39900 : 29900,
        };
      }),
      list: vi.fn(async () => ({
        data: [
          {
            active: true,
            currency: state.priceCurrency,
            id: "price_test_1",
            product: "prod_test_1",
            recurring: {
              interval: "month",
            },
            unit_amount: state.priceCurrency === "usd" ? 39900 : 29900,
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
    state.priceRetrieveId = null;
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
    state.stripeSubscriptions = [];
    state.subscriptionsUpdatePayload = null;
  });

  const createCheckoutFormData = () => {
    const formData = new FormData();
    formData.set("legal_acceptance", "on");
    return formData;
  };

  it("sets 30-day trial for first checkout and enables automatic tax", async () => {
    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );

    const subscriptionData = (state.checkoutPayload?.subscription_data ?? {}) as {
      trial_period_days?: number;
    };
    expect(subscriptionData.trial_period_days).toBe(30);
    expect(state.checkoutPayload?.automatic_tax).toEqual({ enabled: true });
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

  const getSubscriptionData = () =>
    (state.checkoutPayload?.subscription_data ?? {}) as {
      trial_end?: number;
      trial_period_days?: number;
      trial_settings?: unknown;
    };

  it("requires a payment method and cancels the trial if none is present at its end", async () => {
    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );

    expect(state.checkoutPayload?.payment_method_collection).toBe("always");
    expect(getSubscriptionData().trial_settings).toEqual({
      end_behavior: { missing_payment_method: "cancel" },
    });
    expect(state.checkoutPayload?.line_items).toEqual([{ price: "price_test_1", quantity: 1 }]);
  });

  it.each(["active", "trialing", "past_due", "unpaid", "paused"])(
    "blocks a parallel checkout when a %s subscription exists",
    async (status) => {
      state.billingSnapshot.status = status;
      state.billingSnapshot.stripeSubscriptionId = "sub_existing_1";

      await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
        "REDIRECT:/dashboard/billing?error=",
      );
      expect(state.checkoutPayload).toBeNull();
    },
  );

  it("blocks a checkout while a cancellation is scheduled but access is still running", async () => {
    state.billingSnapshot.status = "canceled";
    state.billingSnapshot.hasAppAccess = true;
    state.billingSnapshot.stripeSubscriptionId = "sub_existing_1";

    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:/dashboard/billing?error=",
    );
    expect(state.checkoutPayload).toBeNull();
  });

  it("blocks a checkout when Stripe already holds a live subscription for the customer", async () => {
    state.billingSnapshot.stripeCustomerId = "cus_test_1";
    state.stripeSubscriptions = [{ id: "sub_other", status: "trialing" }];

    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:/dashboard/billing?error=",
    );
    expect(state.checkoutPayload).toBeNull();
  });

  it("allows a new subscription without trial after a fully ended subscription", async () => {
    state.billingSnapshot.status = "canceled";
    state.billingSnapshot.hasAppAccess = false;
    state.billingSnapshot.stripeSubscriptionId = "sub_old";
    state.billingSnapshot.stripeCustomerId = "cus_test_1";
    state.billingSnapshot.trialUsedAt = new Date().toISOString();
    state.stripeSubscriptions = [{ id: "sub_old", status: "canceled" }];

    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );
    expect(getSubscriptionData().trial_period_days).toBeUndefined();
    expect(getSubscriptionData().trial_end).toBeUndefined();
  });

  it("does not create a trial in the database when checkout is only started", async () => {
    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );

    expect(state.subscriptionsUpdatePayload).not.toHaveProperty("trial_used_at");
    expect(state.subscriptionsUpdatePayload).not.toHaveProperty("trial_started_at");
    expect(state.subscriptionsUpdatePayload).not.toHaveProperty("trial_ends_at");
    expect(state.subscriptionsUpdatePayload).not.toHaveProperty("status");
  });

  it("allows a retry after an abandoned checkout and still grants the single trial", async () => {
    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow("REDIRECT:");
    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );
    expect(getSubscriptionData().trial_period_days).toBe(30);
  });

  it("does not grant a new trial to a company whose legacy local trial already expired", async () => {
    state.billingSnapshot.status = "trialing";
    state.billingSnapshot.trialStartedAt = "2020-01-01T00:00:00.000Z";
    state.billingSnapshot.trialEndsAt = "2020-01-31T00:00:00.000Z";

    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );
    expect(getSubscriptionData().trial_period_days).toBeUndefined();
    expect(getSubscriptionData().trial_end).toBeUndefined();
  });

  it("keeps the end date of a still running legacy local trial instead of extending it", async () => {
    const endsAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    state.billingSnapshot.status = "trialing";
    state.billingSnapshot.trialStartedAt = new Date().toISOString();
    state.billingSnapshot.trialEndsAt = endsAt.toISOString();

    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );
    expect(getSubscriptionData().trial_end).toBe(Math.floor(endsAt.getTime() / 1000));
    expect(getSubscriptionData().trial_period_days).toBeUndefined();
  });
  it("uses US checkout locale, currency-matched price and varnito.com return URLs with automatic tax enabled", async () => {
    state.market = "us";
    state.priceCurrency = "usd";

    await expect(startBillingCheckoutAction(createCheckoutFormData())).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.test/session_1",
    );

    expect(state.checkoutPayload?.locale).toBe("en");
    expect(state.checkoutPayload?.automatic_tax).toEqual({ enabled: true });
    expect(state.checkoutPayload?.success_url).toBe(
      "https://varnito.com/dashboard/billing?success=checkout",
    );
    expect(state.checkoutPayload?.cancel_url).toBe(
      "https://varnito.com/dashboard/billing?canceled=1",
    );
    expect(state.priceRetrieveId).toBe("price_1U1WWGLWU9JjdD3HBrfEAezs");
  });
});