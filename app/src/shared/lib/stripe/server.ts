import Stripe from "stripe";

import { loadServerEnv } from "@/shared/config/env";

export const createStripeServerClient = () => {
  const { stripeSecretKey } = loadServerEnv();

  if (!stripeSecretKey) {
    throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
  }

  return new Stripe(stripeSecretKey);
};