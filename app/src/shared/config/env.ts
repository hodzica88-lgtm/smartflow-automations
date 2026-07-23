type PublicEnv = {
  appUrl: string;
  stripePublishableKey?: string;
  vapidPublicKey?: string;
  supabaseAnonKey: string;
  supabaseUrl: string;
};

type ServerEnv = PublicEnv & {
  brevoApiKey?: string;
  brevoSenderEmail?: string;
  brevoSenderName?: string;
  vapidPrivateKey?: string;
  vapidSubject?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  supabaseServiceRoleKey: string;
  internalApiSecret?: string;
  operatorUserIds: string[];
};

type RequiredEnvKey =
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

const getOptionalEnv = (key: string) => {
  const value = process.env[key];

  return value && value.trim().length > 0 ? value : undefined;
};

const getListEnv = (key: string) =>
  (getOptionalEnv(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const getRequiredEnv = (key: RequiredEnvKey) => {
  const value = getOptionalEnv(key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const getRequiredPublicEnv = (
  value: string | undefined,
  key: "NEXT_PUBLIC_SUPABASE_ANON_KEY" | "NEXT_PUBLIC_SUPABASE_URL",
) => {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return trimmedValue;
};

export const publicEnv: PublicEnv = {
  appUrl:
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
  stripePublishableKey:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || undefined,
  vapidPublicKey:
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || undefined,
  supabaseAnonKey: getRequiredPublicEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ),
  supabaseUrl: getRequiredPublicEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  ),
};

export const isValidVapidSubject = (value: string | undefined) => {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("mailto:")) {
    return trimmed.length > "mailto:".length;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const loadServerEnv = (): ServerEnv => {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables cannot be loaded in the browser.");
  }

  return {
    ...publicEnv,
    brevoApiKey: getOptionalEnv("BREVO_API_KEY"),
    brevoSenderEmail: getOptionalEnv("BREVO_SENDER_EMAIL"),
    brevoSenderName: getOptionalEnv("BREVO_SENDER_NAME"),
    vapidPrivateKey: getOptionalEnv("VAPID_PRIVATE_KEY"),
    vapidSubject: getOptionalEnv("VAPID_SUBJECT"),
    stripeSecretKey: getOptionalEnv("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: getOptionalEnv("STRIPE_WEBHOOK_SECRET"),
    supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    internalApiSecret: getOptionalEnv("INTERNAL_API_SECRET"),
    operatorUserIds: getListEnv("OPERATOR_USER_IDS"),
  };
};

export const getPushIntegrationStatus = () => {
  const serverEnv = loadServerEnv();

  return {
    configured:
      Boolean(publicEnv.vapidPublicKey) &&
      Boolean(serverEnv.vapidPrivateKey) &&
      isValidVapidSubject(serverEnv.vapidSubject),
  };
};

export const getIntegrationStatus = () => {
  const serverEnv = loadServerEnv();

  return {
    brevo: Boolean(serverEnv.brevoApiKey && serverEnv.brevoSenderEmail),
    stripe: Boolean(
      publicEnv.stripePublishableKey && serverEnv.stripeSecretKey,
    ),
    push: Boolean(
      publicEnv.vapidPublicKey &&
        serverEnv.vapidPrivateKey &&
        isValidVapidSubject(serverEnv.vapidSubject),
    ),
    supabase: Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey),
  };
};
