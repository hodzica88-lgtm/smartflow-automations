import { describe, expect, it, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  loadServerEnv: {
    stripeSecretKey: "sk_test_123456789",
  },
  priceRetrieveId: null as string | null,
  taxCalculationPayload: null as Record<string, unknown> | null,
  checkoutSessionPayload: null as Record<string, unknown> | null,
}));

vi.mock("@/shared/config/env", () => ({
  loadServerEnv: vi.fn(() => state.loadServerEnv),
}));

vi.mock("@/shared/lib/stripe/server", () => ({
  createStripeServerClient: () => ({
    prices: {
      retrieve: vi.fn(async (priceId: string) => {
        state.priceRetrieveId = priceId;
        return {
          currency: "usd",
          recurring: { interval: "month" },
          product: "prod_us_monthly",
        };
      }),
    },
    tax: {
      calculations: {
        create: vi.fn(async (payload: Record<string, unknown>) => {
          state.taxCalculationPayload = payload;
          return {
            amount_total: 43_210,
            expires_at: 1_736_000_000,
            tax_amount_exclusive: 3_310,
          };
        }),
      },
    },
    checkout: {
      sessions: {
        create: vi.fn(async (payload: Record<string, unknown>) => {
          state.checkoutSessionPayload = payload;
          return { url: "https://checkout.stripe.test/session_preview_1" };
        }),
      },
    },
  }),
}));

const { createUsCheckoutTaxPreview } = await import("./tax-preview");

describe("createUsCheckoutTaxPreview", () => {
  beforeEach(() => {
    state.loadServerEnv.stripeSecretKey = "sk_test_123456789";
    state.priceRetrieveId = null;
    state.taxCalculationPayload = null;
    state.checkoutSessionPayload = null;
  });

  it("creates a Stripe test checkout preview with automatic tax", async () => {
    const preview = await createUsCheckoutTaxPreview({
      addressLine1: "920 5th Ave",
      city: "Seattle",
      state: "WA",
      postalCode: "98104",
      returnUrl: "https://operator.test/operator/companies/company_1",
    });

    expect(state.priceRetrieveId).toBe("price_1U1WWGLWU9JjdD3HBrfEAezs");
    expect(state.taxCalculationPayload).toMatchObject({
      currency: "usd",
      customer_details: {
        address: {
          country: "US",
          line1: "920 5th Ave",
          city: "Seattle",
          state: "WA",
          postal_code: "98104",
        },
        address_source: "billing",
      },
      line_items: [
        {
          amount: 39900,
          quantity: 1,
          reference: "Varnito Pro monthly subscription",
          tax_behavior: "exclusive",
        },
      ],
    });
    expect(state.checkoutSessionPayload).toMatchObject({
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      line_items: [{ price: "price_1U1WWGLWU9JjdD3HBrfEAezs", quantity: 1 }],
      mode: "subscription",
    });
    expect(preview.subtotalCents).toBe(39900);
    expect(preview.taxCents).toBe(3310);
    expect(preview.totalCents).toBe(43210);
    expect(preview.checkoutUrl).toBe("https://checkout.stripe.test/session_preview_1");
  });

  it("disables the preview in live mode", async () => {
    state.loadServerEnv.stripeSecretKey = "sk_live_123456789";

    await expect(
      createUsCheckoutTaxPreview({
        addressLine1: "920 5th Ave",
        city: "Seattle",
        state: "WA",
        postalCode: "98104",
        returnUrl: "https://operator.test/operator/companies/company_1",
      }),
    ).rejects.toThrow("Tax preview is only available in Stripe test mode.");
  });
});