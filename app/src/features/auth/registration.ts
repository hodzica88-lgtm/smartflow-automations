const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 10;
// bcrypt, used by Supabase Auth, ignores everything beyond 72 bytes.
const MAX_PASSWORD_BYTES = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizeRegistrationEmail = (value: string) => value.trim().toLowerCase();

export const isValidRegistrationEmail = (email: string) =>
  email.length > 0 && email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);

export const isValidRegistrationPassword = (password: string) =>
  password.length >= MIN_PASSWORD_LENGTH &&
  new TextEncoder().encode(password).length <= MAX_PASSWORD_BYTES &&
  /\p{L}/u.test(password) &&
  /\p{N}/u.test(password);

// Only plain, short tokens are forwarded as first-touch attribution.
export const sanitizeRegistrationSource = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? "";

  return /^[a-zA-Z0-9_.-]{1,64}$/.test(trimmed) ? trimmed : "";
};

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "us.localhost"]);

// Production uses the market site URL. Local development keeps the local origin so that
// confirmation links return to the dev server.
export const resolveAuthRedirectBase = (host: string | null | undefined, siteUrl: string) => {
  const hostname = host?.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";

  if (LOCAL_HOSTNAMES.has(hostname)) {
    const port = host?.split(",")[0]?.trim().split(":")[1];

    return `http://${hostname}${port ? `:${port}` : ""}`;
  }

  return siteUrl;
};
