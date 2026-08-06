import { createErrorResponse } from "@/shared/lib/http/errors";

export const buildRateLimitedResponse = (message: string, retryAfterSeconds: number) =>
  createErrorResponse({
    status: 429,
    code: "RATE_LIMITED",
    message,
    retryAfterSeconds,
  });
