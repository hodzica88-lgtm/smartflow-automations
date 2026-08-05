import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  companyOwned: true,
  stripeSubscriptionId: "sub_test_sync_123",
  subscriptionUpdatePayload: null as Record<string, unknown> | null,
  stripeRetrieveCalls: 0,
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServiceRoleClient: vi.fn(() => ({
    from(table: string) {
      if (table === "companies") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      is() {
                        return {
                          async maybeSingle() {
                            return {
                              data: testState.companyOwned ? { id: "company_test_123" } : null,
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
          },
        };
      }

      if (table === "subscriptions") {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return {
                      data: testState.stripeSubscriptionId
                        ? { stripe_subscription_id: testState.stripeSubscriptionId }
                        : null,
                      error: null,
                    };
                  },
                };
              },
            };
          },
          update(payload: Record<string, unknown>) {
            testState.subscriptionUpdatePayload = payload;
            return {
              async eq() {
                return { error: null };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

vi.mock("@/features/onboarding/company", () => ({
  getUserCompanyState: vi.fn(),
}));

vi.mock("@/shared/lib/stripe/server", () => ({
  createStripeServerClient: () => ({
    subscriptions: {
      retrieve: vi.fn(async () => {
        testState.stripeRetrieveCalls += 1;

        return {
          cancel_at: 2_000_800_000,
          cancel_at_period_end: true,
          canceled_at: 2_001_000_000,
          customer: "cus_sync_123",
          id: "sub_test_sync_123",
          items: {
            data: [
              {
                current_period_end: 2_000_500_000,
                current_period_start: 2_000_000_000,
                price: {
                  id: "price_sync_123",
                  product: "prod_sync_123",
                },
              },
            ],
          },
          status: "active",
          trial_end: 2_000_200_000,
          trial_start: 2_000_100_000,
        };
      }),
    },
  }),
}));

const { syncOwnerCompanyBillingFromStripe } = await import("./service");

describe("syncOwnerCompanyBillingFromStripe", () => {
  beforeEach(() => {
    testState.companyOwned = true;
    testState.stripeSubscriptionId = "sub_test_sync_123";
    testState.subscriptionUpdatePayload = null;
    testState.stripeRetrieveCalls = 0;
  });

  it("updates subscription fields from Stripe for company owner", async () => {
    await syncOwnerCompanyBillingFromStripe({
      companyId: "company_test_123",
      ownerUserId: "owner_user_123",
    });

    expect(testState.stripeRetrieveCalls).toBe(1);
    expect(testState.subscriptionUpdatePayload).toMatchObject({
      cancel_at_period_end: true,
      plan: "pro",
      status: "active",
      stripe_customer_id: "cus_sync_123",
      stripe_price_id: "price_sync_123",
      stripe_product_id: "prod_sync_123",
      stripe_subscription_id: "sub_test_sync_123",
    });

    expect((testState.subscriptionUpdatePayload?.current_period_start as string) ?? "").toContain("2033-");
    expect((testState.subscriptionUpdatePayload?.current_period_end as string) ?? "").toContain("2033-");
    expect((testState.subscriptionUpdatePayload?.trial_started_at as string) ?? "").toContain("2033-");
    expect((testState.subscriptionUpdatePayload?.trial_ends_at as string) ?? "").toContain("2033-");
    expect((testState.subscriptionUpdatePayload?.cancel_at as string) ?? "").toContain("2033-");
    expect((testState.subscriptionUpdatePayload?.canceled_at as string) ?? "").toContain("2033-");
  });

  it("rejects synchronization when requester is not owner", async () => {
    testState.companyOwned = false;

    await expect(
      syncOwnerCompanyBillingFromStripe({
        companyId: "company_test_123",
        ownerUserId: "member_user_123",
      }),
    ).rejects.toThrow("Nur Eigentümer dürfen das Billing synchronisieren.");

    expect(testState.stripeRetrieveCalls).toBe(0);
    expect(testState.subscriptionUpdatePayload).toBeNull();
  });
});