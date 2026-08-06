import { createStripeServerClient } from "@/shared/lib/stripe/server";
import { loadServerEnv } from "@/shared/config/env";

export const US_MONTHLY_CHECKOUT_PRICE_ID = "price_1U1WWGLWU9JjdD3HBrfEAezs";
export const US_MONTHLY_CHECKOUT_AMOUNT_CENTS = 39_900;

export type UsCheckoutTaxPreviewInput = {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  returnUrl: string;
};

export type UsCheckoutTaxPreviewResult = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  checkoutUrl: string;
  expiresAt: string | null;
};

export const isStripeTestMode = (secretKey?: string | null) => {
  return Boolean(secretKey?.trim().startsWith("sk_test_"));
};

const toIsoString = (timestamp: number | null | undefined) => {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString();
};

export const createUsCheckoutTaxPreview = async (
  input: UsCheckoutTaxPreviewInput,
): Promise<UsCheckoutTaxPreviewResult> => {
  const serverEnv = loadServerEnv();

  if (!isStripeTestMode(serverEnv.stripeSecretKey)) {
    throw new Error("Tax preview is only available in Stripe test mode.");
  }

  const stripe = createStripeServerClient();
  const price = await stripe.prices.retrieve(US_MONTHLY_CHECKOUT_PRICE_ID, {
    expand: ["product"],
  });

  if (price.currency !== "usd" || price.recurring?.interval !== "month") {
    throw new Error("The configured US monthly price is invalid.");
  }

  const calculation = await stripe.tax.calculations.create({
    currency: "usd",
    customer_details: {
      address: {
        country: "US",
        line1: input.addressLine1,
        city: input.city,
        state: input.state,
        postal_code: input.postalCode,
      },
      address_source: "billing",
    },
    line_items: [
      {
        amount: US_MONTHLY_CHECKOUT_AMOUNT_CENTS,
        quantity: 1,
        reference: "Varnito Pro monthly subscription",
        tax_behavior: "exclusive",
        product: typeof price.product === "string" ? price.product : price.product.id,
      },
    ],
    expand: ["line_items"],
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    automatic_tax: { enabled: true },
    billing_address_collection: "required",
    line_items: [{ price: US_MONTHLY_CHECKOUT_PRICE_ID, quantity: 1 }],
    customer_creation: "always",
    success_url: input.returnUrl,
    cancel_url: input.returnUrl,
    metadata: {
      preview_type: "us_checkout_tax_preview",
    },
  });

  return {
    subtotalCents: US_MONTHLY_CHECKOUT_AMOUNT_CENTS,
    taxCents: calculation.tax_amount_exclusive ?? 0,
    totalCents: calculation.amount_total ?? US_MONTHLY_CHECKOUT_AMOUNT_CENTS,
    checkoutUrl: session.url ?? input.returnUrl,
    expiresAt: toIsoString(calculation.expires_at),
  };
};