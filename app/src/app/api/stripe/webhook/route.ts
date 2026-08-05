import { processStripeWebhookRequest } from "@/features/billing/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return processStripeWebhookRequest(request);
}