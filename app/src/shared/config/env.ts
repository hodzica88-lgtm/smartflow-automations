type PublicEnv = {
  appUrl: string;
  stripePublishableKey?: string;
  supabaseAnonKey: string;
  supabaseUrl: string;
};

type ServerEnv = PublicEnv & {
  brevoApiKey?: string;
  brevoSenderEmail?: string;
  brevoSenderName?: string;
  makeApiKey?: string;
  makeWebhookUrl?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  supabaseServiceRoleKey: string;
};

type RequiredEnvKey =
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

const getOptionalEnv = (key: string) => {
  const value = process.env[key];

  return value && value.trim().length > 0 ? value : undefined;
};

const getRequiredEnv = (key: RequiredEnvKey) => {
  const value = getOptionalEnv(key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const publicEnv: PublicEnv = {
  appUrl: getOptionalEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  stripePublishableKey: getOptionalEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  supabaseAnonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseUrl: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
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
    makeApiKey: getOptionalEnv("MAKE_API_KEY"),
    makeWebhookUrl: getOptionalEnv("MAKE_WEBHOOK_URL"),
    stripeSecretKey: getOptionalEnv("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: getOptionalEnv("STRIPE_WEBHOOK_SECRET"),
    supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
};

export const getIntegrationStatus = () => {
  const serverEnv = loadServerEnv();

  return {
    brevo: Boolean(serverEnv.brevoApiKey && serverEnv.brevoSenderEmail),
    make: Boolean(serverEnv.makeWebhookUrl),
    stripe: Boolean(
      publicEnv.stripePublishableKey && serverEnv.stripeSecretKey,
    ),
    supabase: Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey),
  };
};
