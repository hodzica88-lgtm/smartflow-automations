export const buildRateLimitedResponse = (message: string, retryAfterSeconds: number) => {
  const safeRetryAfterSeconds =
    Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.floor(retryAfterSeconds)
      : 60;

  return new Response(message, {
    status: 429,
    headers: {
      "retry-after": String(safeRetryAfterSeconds),
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
};
