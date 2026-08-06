import { createEventId } from "@/shared/lib/observability/logger";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

type ErrorResponseInput = {
  status: 401 | 403 | 404 | 429 | 500;
  code: ErrorCode;
  message: string;
  retryAfterSeconds?: number;
};

export const createErrorResponse = (input: ErrorResponseInput) => {
  const eventId = createEventId("api");
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cache-control": "no-store",
  };

  if (input.status === 429) {
    const retryAfter =
      Number.isFinite(input.retryAfterSeconds) && (input.retryAfterSeconds ?? 0) > 0
        ? Math.floor(input.retryAfterSeconds as number)
        : 60;
    headers["retry-after"] = String(retryAfter);
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code: input.code,
        message: input.message,
        eventId,
      },
    }),
    {
      status: input.status,
      headers,
    },
  );
};
