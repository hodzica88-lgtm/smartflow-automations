type LogLevel = "info" | "warn" | "error";

type LoggerInput = {
  message: string;
  eventId: string;
  context?: Record<string, unknown>;
  error?: unknown;
};

const REDACT_KEYS = ["password", "secret", "token", "authorization", "cookie", "email", "phone"];

const shouldRedactKey = (key: string) => {
  const lower = key.toLowerCase();
  return REDACT_KEYS.some((needle) => lower.includes(needle));
};

const redactValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      output[key] = shouldRedactKey(key) ? "[REDACTED]" : redactValue(entry);
    }

    return output;
  }

  return value;
};

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return undefined;
};

export const createEventId = (prefix: string) => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
};

export const logServerEvent = (level: LogLevel, input: LoggerInput) => {
  const payload = {
    level,
    eventId: input.eventId,
    message: input.message,
    context: input.context ? redactValue(input.context) : undefined,
    error: normalizeError(input.error),
    at: new Date().toISOString(),
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
};
