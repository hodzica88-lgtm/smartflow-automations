import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  upsertCompanySubscription: vi.fn(),
  webhookEvents: new Map<string, { id: string; processed_at: string | null }>(),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: vi.fn(() => ({
    from(table: string) {
      if (table === "stripe_webhook_events") {
        return {
          select() {
            return {
              eq(_column: string, value: string) {
                return {
                  async maybeSingle() {
                    return { data: testState.webhookEvents.get(value) ?? null, error: null };
                  },
                };
              },
            };
          },
          async insert(payload: { stripe_event_id: string }) {
            testState.webhookEvents.set(payload.stripe_event_id, {
              id: payload.stripe_event_id,
              processed_at: null,
            });

            return { error: null };
          },
          update(payload: { processed_at: string }) {
            return {
              async eq(_column: string, value: string) {
                const existing = testState.webhookEvents.get(value);

                if (existing) {
                  testState.webhookEvents.set(value, {
                    ...existing,
                    processed_at: payload.processed_at,
                  });
                }

                return { error: null };
              },
            };
          },
        };
      }

      if (table === "subscriptions") {
        return {
          select() {
            return {
              limit() {
                return {
                  eq(_column: string, value: string) {
                    return {
                      async maybeSingle() {
                        if (value === "sub_test_123" || value === "cus_test_123") {
                          return { data: { company_id: "company_test_123" }, error: null };
                        }

                        return { data: null, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

vi.mock("@/shared/lib/stripe/server", async () => {
  const StripeModule = await import("stripe");
  const stripeClient = new StripeModule.default("sk_test_123456789");

  vi.spyOn(stripeClient.subscriptions, "retrieve").mockResolvedValue({
    cancel_at_period_end: false,
    canceled_at: null,
    current_period_end: 2_000_000_000,
    current_period_start: 1_999_000_000,
    customer: "cus_test_123",
    id: "sub_test_123",
    items: {
      data: [
        {
          price: {
            id: "price_test_123",
            product: "prod_test_123",
          },
        },
      ],
    },
    metadata: {
      company_id: "company_test_123",
    },
    status: "active",
    trial_end: null,
    trial_start: null,
  } as unknown as Stripe.Response<Stripe.Subscription>);

  return {
    createStripeServerClient: () => stripeClient,
  };
});

vi.mock("@/features/billing/service", () => ({
  BILLING_LOOKUP_KEY: "varnito_pro_monthly",
  normalizeBillingStatus: (value: string) => value,
  upsertCompanySubscription: testState.upsertCompanySubscription,
}));

vi.mock("@/shared/config/env", () => ({
  loadServerEnv: () => ({
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  }),
}));

import { processStripeWebhookRequest } from "./webhook";

describe("processStripeWebhookRequest", () => {
  const webhookSecret = "whsec_test_secret";
  const stripeClient = new Stripe("sk_test_123456789");

  beforeEach(() => {
    testState.webhookEvents.clear();
    testState.upsertCompanySubscription.mockReset();
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("verifies, processes, and deduplicates checkout webhook events", async () => {
    const payload = JSON.stringify({
      id: "evt_test_123",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          object: "checkout.session",
          mode: "subscription",
          client_reference_id: "company_test_123",
          customer: "cus_test_123",
          subscription: "sub_test_123",
          metadata: {
            company_id: "company_test_123",
          },
        },
      },
    });

    const signature = stripeClient.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    const createRequest = () =>
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
        body: payload,
      });

    const firstResponse = await processStripeWebhookRequest(createRequest());
    const secondResponse = await processStripeWebhookRequest(createRequest());

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(testState.upsertCompanySubscription).toHaveBeenCalledTimes(2);
    expect(testState.upsertCompanySubscription).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        companyId: "company_test_123",
        plan: "pro",
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_123",
      }),
    );
    expect(testState.upsertCompanySubscription).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        companyId: "company_test_123",
        plan: "pro",
        status: "active",
        stripePriceId: "price_test_123",
        stripeProductId: "prod_test_123",
      }),
    );
    expect(testState.webhookEvents.get("evt_test_123")?.processed_at).toBeTruthy();
  });
});