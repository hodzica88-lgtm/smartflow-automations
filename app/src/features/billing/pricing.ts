import type Stripe from "stripe";

import { BILLING_LOOKUP_KEY } from "@/features/billing/service";
import { createStripeServerClient } from "@/shared/lib/stripe/server";
import { getMarketConfig, type MarketCode } from "@/shared/i18n/market";

export const DEFAULT_US_MONTHLY_PRICE_ID = "price_1U1WWGLWU9JjdD3HBrfEAezs";

const getConfiguredMonthlyPriceId = (market: MarketCode) => {
  if (market === "us") {
    return process.env.STRIPE_PRICE_ID_US_MONTHLY?.trim() || DEFAULT_US_MONTHLY_PRICE_ID;
  }

  return process.env.STRIPE_PRICE_ID_DE_MONTHLY?.trim() || null;
};

const assertMonthlyCurrencyPrice = (
  price: Stripe.Price,
  expectedCurrency: "eur" | "usd",
) => {
  if (!price.active) {
    throw new Error("Der Stripe-Preis ist nicht aktiv.");
  }

  if (price.currency !== expectedCurrency || price.recurring?.interval !== "month") {
    throw new Error("Der Stripe-Preis für Varnito Pro konnte nicht geladen werden.");
  }

  return price;
};

export const getStripeMonthlyPriceForMarket = async (
  stripe: Stripe,
  market: MarketCode,
) => {
  const marketConfig = getMarketConfig(market);
  const configuredPriceId = getConfiguredMonthlyPriceId(market);

  if (configuredPriceId) {
    const price = await stripe.prices.retrieve(configuredPriceId, {
      expand: ["product"],
    });
    return assertMonthlyCurrencyPrice(price, marketConfig.currency);
  }

  // Backward-compatible fallback for existing DE setups without explicit price id.
  const prices = await stripe.prices.list({
    active: true,
    expand: ["data.product"],
    lookup_keys: [BILLING_LOOKUP_KEY],
    limit: 10,
  });

  const matchingPrice = prices.data.find(
    (candidate) =>
      candidate.currency === marketConfig.currency &&
      candidate.recurring?.interval === "month",
  );

  if (!matchingPrice) {
    throw new Error("Der Stripe-Preis für Varnito Pro konnte nicht geladen werden.");
  }

  return matchingPrice;
};

const formatPriceAmount = (
  amountInCents: number | null,
  locale: "de-DE" | "en-US",
  currency: "eur" | "usd",
) => {
  if (amountInCents === null) {
    return currency.toUpperCase();
  }

  const hasFraction = amountInCents % 100 !== 0;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100);
};

export const formatStripeMonthlyPriceLabel = (
  price: Pick<Stripe.Price, "currency" | "unit_amount">,
  market: MarketCode,
) => {
  const marketConfig = getMarketConfig(market);
  const suffix = market === "us" ? "month" : "Monat";

  return `${formatPriceAmount(price.unit_amount, marketConfig.locale, marketConfig.currency)} / ${suffix}`;
};

export const getFormattedStripeMonthlyPriceForMarket = async (market: MarketCode) => {
  const stripe = createStripeServerClient();
  const price = await getStripeMonthlyPriceForMarket(stripe, market);

  return {
    id: price.id,
    label: formatStripeMonthlyPriceLabel(price, market),
  };
};
